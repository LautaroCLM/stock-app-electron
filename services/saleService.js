// services/saleService.js
//
// Fase 0.1 / Fase 6 — Servicio para el módulo de Ventas.
// Encapsula las operaciones de ventas locales en SQLite e integra Dual Write a Supabase.

'use strict';

const CONFIG = require('./config');
const supabaseSaleService = require('./supabaseSaleService');
const supabaseProductService = require('./supabaseProductService');
const crypto = require('crypto');

/**
 * Fábrica del servicio de Ventas.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @param {object} [ticketService=null] - Instancia de TicketService para réplica local de tickets.
 * @returns {object} Objeto con los métodos del servicio de ventas.
 */
function createSaleService(db, registrarAccion, syncManager = null, ticketService = null) {
  if (!db) {
    throw new Error('[SaleService] Instancia de base de datos requerida.');
  }

  // Asegurar migración de columna client_transaction_id en SQLite local
  try {
    const existingCols = new Set(db.prepare("PRAGMA table_info(ventas)").all().map(c => c.name));
    if (!existingCols.has('client_transaction_id')) {
      db.prepare("ALTER TABLE ventas ADD COLUMN client_transaction_id TEXT").run();
      console.log('[SaleService] Columna client_transaction_id agregada a ventas en SQLite.');
    }
  } catch (migErr) {
    console.warn('[SaleService] Error verificando esquema de ventas:', migErr.message);
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[SaleService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[SaleService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  /**
   * Obtiene la lista de ventas registradas en SQLite local.
   * @param {number} [limit=100] - Límite de registros a obtener.
   * @returns {Array<object>}
   */
  function getSales(limit = 100) {
    return db.prepare(`
      SELECT v.*, p.nombre as producto_nombre, p.codigo as producto_codigo
      FROM ventas v
      LEFT JOIN productos p ON v.producto_id = p.id
      ORDER BY v.fecha DESC, v.id DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Registra una venta individual o de carrito completo en SQLite local.
   * 
   * @param {object} params
   * @param {number} [params.id] - ID del producto si es venta individual.
   * @param {number} [params.cantidad] - Cantidad si es venta individual.
   * @param {string} [params.metodo_pago='Efectivo'] - Método de pago.
   * @param {Array<object>} [params.carritoCompleto=null] - Lista de productos si es venta de carrito.
   * @returns {{ success: boolean, total?: number, error?: string }}
   */
  async function sellProduct({ id, cantidad, metodo_pago = 'Efectivo', carritoCompleto = null, ajuste = null, client_transaction_id = null }) {
    try {
      const clientTransactionId = client_transaction_id || (carritoCompleto && carritoCompleto._client_transaction_id) || crypto.randomUUID();

      // 🟢 Modo ONLINE: Venta atómica directa en Supabase vía RPC
      if (CONFIG.APP_MODE === 'ONLINE') {
        let itemsInput = [];
        if (Array.isArray(carritoCompleto) && carritoCompleto.length > 0) {
          itemsInput = carritoCompleto;
        } else if (id) {
          itemsInput = [{ id, cantidad }];
        }

        if (itemsInput.length === 0) {
          return { success: false, error: 'No hay ítems para vender.' };
        }

        let subtotalVenta = 0;
        const validItems = [];

        for (const item of itemsInput) {
          const pId = Number(item.id || item.producto_id);
          let pNombre = item.nombre || null;
          let pPrecio = Number(item.precio || 0);
          const pCantidad = Number(item.cantidad || 1);
          let pUuid = item.uuid || item.producto_uuid || null;
          let pRemoteId = null;

          try {
            const dbProd = db.prepare('SELECT uuid, nombre, precio FROM productos WHERE id = ?').get(pId);
            if (dbProd) {
              if (!pNombre) pNombre = dbProd.nombre;
              if (!pPrecio || pPrecio === 0) pPrecio = Number(dbProd.precio || 0);
              if (!pUuid && dbProd.uuid) pUuid = dbProd.uuid;
            }
          } catch (e) {}

          if (pUuid && typeof supabaseProductService.resolveRemoteProductIdByUuid === 'function') {
            pRemoteId = await supabaseProductService.resolveRemoteProductIdByUuid(pUuid);
          }

          const itemVentaUuid = item.venta_uuid || crypto.randomUUID();
          const itemSubtotal = pPrecio * pCantidad;
          subtotalVenta += itemSubtotal;
          validItems.push({
            producto_id: pRemoteId || pId,
            local_producto_id: pId,
            uuid: itemVentaUuid,
            producto_uuid: pUuid,
            ticket_uuid: clientTransactionId,
            nombre: pNombre || `Producto #${pId}`,
            precio: pPrecio,
            cantidad: pCantidad,
            itemSubtotal
          });
        }

        let totalFinalVenta = subtotalVenta;
        if (ajuste && Number(ajuste.valor) > 0 && subtotalVenta > 0) {
          const valor = Number(ajuste.valor || 0);
          let monto = ajuste.modo === 'percent'
            ? (subtotalVenta * valor / 100)
            : valor;
          if (ajuste.tipo === 'discount') {
            monto = -Math.abs(monto);
          } else {
            monto = Math.abs(monto);
          }
          totalFinalVenta = Math.max(0, subtotalVenta + monto);
        }

        let sumaAsignada = 0;
        const payloadItems = [];
        for (let i = 0; i < validItems.length; i++) {
          const item = validItems[i];
          const isLast = (i === validItems.length - 1);
          let totalItem = item.itemSubtotal;

          if (subtotalVenta > 0 && totalFinalVenta !== subtotalVenta) {
            if (isLast) {
              totalItem = Math.round((totalFinalVenta - sumaAsignada) * 100) / 100;
            } else {
              const ratio = item.itemSubtotal / subtotalVenta;
              totalItem = Math.round((totalFinalVenta * ratio) * 100) / 100;
              sumaAsignada += totalItem;
            }
          }

          payloadItems.push({
            id: item.local_producto_id,
            producto_id: item.producto_id,
            producto_uuid: item.producto_uuid || null,
            uuid: item.uuid,
            ticket_uuid: item.ticket_uuid,
            nombre: item.nombre,
            precio: item.precio || (item.cantidad ? Math.round((totalItem / item.cantidad) * 100) / 100 : 0),
            cantidad: item.cantidad,
            total: totalItem
          });
        }

        const result = await supabaseSaleService.processCartSaleAtomic({
          items: payloadItems,
          metodo_pago,
          cliente: 'Consumidor Final',
          client_transaction_id: clientTransactionId
        });

        if (!result || !result.success) {
          const isNetErr = Boolean(
            result?.isNetworkError ||
            (result?.error && (
              result.error.includes('fetch failed') ||
              result.error.includes('Failed to fetch') ||
              result.error.includes('network')
            ))
          );

          if (isNetErr) {
            console.warn('[SaleService] ⚠️ Conexión remota no disponible (fetch failed). Ejecutando fallback atómico a venta OFFLINE en SQLite local...');

            // 1. Validar stock local antes de la transacción
            for (const item of payloadItems) {
              const dbProd = db.prepare('SELECT id, nombre, stock FROM productos WHERE id = ?').get(item.producto_id);
              if (!dbProd) {
                return { success: false, error: `Producto #${item.producto_id} no existe en la base local.` };
              }
              if (dbProd.stock < item.cantidad) {
                return { success: false, error: `STOCK_INSUFICIENTE: ${dbProd.nombre} (Stock local: ${dbProd.stock}, Solicitado: ${item.cantidad})` };
              }
            }

            // 2. Ejecutar transacción atómica en SQLite local
            try {
              const runOfflineSaleTransaction = db.transaction(() => {
                const insertVenta = db.prepare(`
                  INSERT INTO ventas (producto_id, cantidad, total, metodo_pago, cliente, client_transaction_id, uuid, producto_uuid, ticket_uuid)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                const updateStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');

                for (const item of payloadItems) {
                  insertVenta.run(item.producto_id, item.cantidad, item.total, metodo_pago, 'Consumidor Final', clientTransactionId, item.uuid, item.producto_uuid || null, clientTransactionId);
                  updateStock.run(item.cantidad, item.producto_id);
                }

                const descuentoMonto = subtotalVenta > totalFinalVenta ? (subtotalVenta - totalFinalVenta) : 0;
                const insertTicket = db.prepare(`
                  INSERT INTO tickets (fecha, metodo_pago, total, productos, tipo, descuento, subtotal, cliente, client_transaction_id, uuid)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                const ticketInfo = insertTicket.run(
                  new Date().toISOString(),
                  metodo_pago,
                  totalFinalVenta,
                  JSON.stringify(payloadItems),
                  'Venta',
                  descuentoMonto,
                  subtotalVenta,
                  'Consumidor Final',
                  clientTransactionId,
                  clientTransactionId
                );
                const localTicketId = ticketInfo.lastInsertRowid;

                if (syncManager && syncManager.offlineQueue) {
                  syncManager.offlineQueue.addOperation({
                    entity: 'ventas_cart',
                    action: 'PROCESS_ATOMIC',
                    payload: {
                      client_transaction_id: clientTransactionId,
                      items: payloadItems,
                      metodo_pago,
                      cliente: 'Consumidor Final',
                      subtotal: subtotalVenta,
                      total: totalFinalVenta,
                      ajuste,
                      local_ticket_id: localTicketId
                    }
                  });
                }

                return localTicketId;
              });

              const localTicketId = runOfflineSaleTransaction();
              console.log(`[SaleService] 📦 Venta OFFLINE guardada exitosamente en SQLite (Ticket #${localTicketId}, UUID: ${clientTransactionId}). Encolada para sincronización.`);

              if (typeof registrarAccion === 'function') {
                registrarAccion('Venta (Offline)', `Venta local por $${totalFinalVenta.toFixed(2)} (UUID: ${clientTransactionId})`);
              }

              return { success: true, offline: true, total: totalFinalVenta, ticket_id: localTicketId };
            } catch (txErr) {
              console.error('[SaleService] Error en transacción SQLite de venta offline:', txErr.message);
              return { success: false, error: `Error registrando venta offline local: ${txErr.message}` };
            }
          }

          return { success: false, error: result?.error || 'Error al procesar la venta en Supabase.' };
        }

        const ticketId = result.data?.ticket_id || result.data?.id || null;
        const ticketUuid = result.data?.ticket_uuid || clientTransactionId;

        try {
          for (const item of payloadItems) {
            db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(item.cantidad, item.producto_id);
            db.prepare('INSERT INTO ventas (producto_id, cantidad, total, metodo_pago, client_transaction_id, uuid, producto_uuid, ticket_uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
              item.producto_id,
              item.cantidad,
              item.total,
              metodo_pago,
              clientTransactionId,
              item.uuid,
              item.producto_uuid || null,
              ticketUuid
            );
          }

          if (ticketService && ticketId) {
            ticketService.upsertTicket({
              id: ticketId,
              uuid: ticketUuid,
              client_transaction_id: clientTransactionId,
              fecha: new Date().toISOString(),
              metodo_pago,
              total: totalFinalVenta,
              productos: payloadItems,
              tipo: 'Venta',
              subtotal: subtotalVenta,
              cliente: 'Consumidor Final'
            });
            console.log(`[SaleService] Ticket ${ticketId} replicado en SQLite local sin Dual Write.`);
          }
        } catch (e) {
          console.warn('[SaleService] No se pudo actualizar el caché SQLite local:', e.message);
        }

        if (typeof registrarAccion === 'function') {
          registrarAccion('Venta (Online)', `Venta atómica procesada en Supabase por $${totalFinalVenta.toFixed(2)}`);
        }

        return { success: true, total: totalFinalVenta, ticket_id: ticketId };
      }

      // 🟢 Modo LOCAL: Venta local en SQLite tradicional
      if (Array.isArray(carritoCompleto) && carritoCompleto.length > 0) {
        let subtotalVenta = 0;
        const validItems = [];

        // 1. Filtrar los ítems válidos y calcular subtotal bruto
        for (const item of carritoCompleto) {
          const product = db.prepare('SELECT * FROM productos WHERE id = ?').get(item.id);
          if (!product) continue;
          if (product.stock < item.cantidad) {
            console.warn(`[SaleService] Stock insuficiente para ${product.nombre}`);
            continue;
          }
          const itemSubtotal = product.precio * item.cantidad;
          subtotalVenta += itemSubtotal;
          validItems.push({ item, product, itemSubtotal });
        }

        if (validItems.length === 0) {
          return { success: false, error: 'No hay stock suficiente para realizar la venta' };
        }

        // 2. Calcular el total final aplicando el ajuste si existe
        let totalFinalVenta = subtotalVenta;
        if (ajuste && Number(ajuste.valor) > 0 && subtotalVenta > 0) {
          const valor = Number(ajuste.valor || 0);
          let monto = ajuste.modo === 'percent'
            ? (subtotalVenta * valor / 100)
            : valor;
          if (ajuste.tipo === 'discount') {
            monto = -Math.abs(monto);
          } else {
            monto = Math.abs(monto);
          }
          totalFinalVenta = Math.max(0, subtotalVenta + monto);
        }

        // 3. Procesar las ventas individuales distribuyendo el ajuste proporcionalmente
        let totalVentaAcumulado = 0;
        let sumaAsignada = 0;
        let ventasExitosas = 0;
        const productosVendidos = [];

        const insertVenta = db.prepare(`
          INSERT INTO ventas (producto_id, cantidad, total, metodo_pago, client_transaction_id)
          VALUES (?, ?, ?, ?, ?)
        `);
        const updateStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');

        for (let i = 0; i < validItems.length; i++) {
          const { item, product, itemSubtotal } = validItems[i];
          const isLast = (i === validItems.length - 1);

          let totalItem = itemSubtotal;
          if (subtotalVenta > 0 && totalFinalVenta !== subtotalVenta) {
            if (isLast) {
              totalItem = Math.round((totalFinalVenta - sumaAsignada) * 100) / 100;
            } else {
              const ratio = itemSubtotal / subtotalVenta;
              totalItem = Math.round((totalFinalVenta * ratio) * 100) / 100;
              sumaAsignada += totalItem;
            }
          }

          totalVentaAcumulado += totalItem;
          productosVendidos.push(`${product.nombre} (${item.cantidad}u)`);

          const info = insertVenta.run(item.id, item.cantidad, totalItem, metodo_pago, clientTransactionId);
          const ventaId = info.lastInsertRowid;

          updateStock.run(item.cantidad, item.id);
          const nuevoStockItem = product.stock - item.cantidad;
          ventasExitosas++;

          // Dual Write asíncrono de la venta hacia Supabase (no bloqueante)
          handleDualWrite(
            supabaseSaleService.addSale({
              id: ventaId,
              producto_id: item.id,
              cantidad: item.cantidad,
              total: totalItem,
              metodo_pago,
              cliente: 'Consumidor Final',
              client_transaction_id: clientTransactionId
            }),
            'ventas',
            'INSERT',
            {
              id: ventaId,
              producto_id: item.id,
              cantidad: item.cantidad,
              total: totalItem,
              metodo_pago,
              cliente: 'Consumidor Final',
              client_transaction_id: clientTransactionId
            }
          );

          // Dual Write asíncrono del descuento de stock en Supabase (no bloqueante)
          const itemProd = db.prepare('SELECT uuid FROM productos WHERE id = ?').get(item.id);
          const itemUuid = itemProd?.uuid || null;
          if (itemUuid) {
            handleDualWrite(
              supabaseProductService.updateStockByUuid(itemUuid, nuevoStockItem),
              'productos',
              'UPDATE_STOCK',
              { uuid: itemUuid, stock: nuevoStockItem, id: item.id }
            );
          }
        }

        if (ventasExitosas > 0) {
          if (typeof registrarAccion === 'function') {
            registrarAccion(
              'Venta (Carrito)',
              `Productos: ${productosVendidos.join(', ')} | Total: $${totalVentaAcumulado.toFixed(2)} | Pago: ${metodo_pago}`
            );
          }
          return { success: true, total: totalVentaAcumulado };
        } else {
          return { success: false, error: 'No se pudo procesar ningún ítem' };
        }
      }

      // 🟢 Caso 2: Venta Individual
      const product = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
      if (!product) return { success: false, error: 'Producto no encontrado' };

      const nuevoStock = Math.max(0, product.stock - cantidad);
      db.prepare('UPDATE productos SET stock = ? WHERE id = ?').run(nuevoStock, id);

      const total = product.precio * cantidad;
      let ventaId = null;

      if (ticketService) {
        const ticketResult = ticketService.createTicket({
          metodo_pago,
          cliente: 'Consumidor Final',
          productos: [{ id: product.id, nombre: product.nombre, cantidad, precio: product.precio, subtotal: total }],
          subtotal: total,
          monto_descuento: 0,
          tipo_descuento: 'ninguno',
          total: total,
          client_transaction_id: clientTransactionId
        });

        if (ticketResult && ticketResult.success && ticketResult.id) {
          ventaId = ticketResult.id;
        }
      }

      if (!ventaId) {
        const stmtVenta = db.prepare(`
          INSERT INTO ventas (producto_id, cantidad, total, cliente, metodo_pago, client_transaction_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const info = stmtVenta.run(id, cantidad, total, 'Consumidor Final', metodo_pago, clientTransactionId);
        ventaId = info.lastInsertRowid;
      }

      if (typeof registrarAccion === 'function') {
        registrarAccion(
          'Venta',
          `Producto: ${product.nombre} (x${cantidad}) - Total: $${total} - Método: ${metodo_pago}`
        );
      }

      // Dual Write asíncrono de la venta hacia Supabase (no bloqueante)
      handleDualWrite(
        supabaseSaleService.addSale({
          id: ventaId,
          producto_id: id,
          cantidad: cantidad,
          total: total,
          metodo_pago,
          cliente: 'Consumidor Final',
          client_transaction_id: clientTransactionId
        }),
        'ventas',
        'INSERT',
        {
          id: ventaId,
          producto_id: id,
          cantidad: cantidad,
          total: total,
          metodo_pago,
          cliente: 'Consumidor Final',
          client_transaction_id: clientTransactionId
        }
      );

      // Dual Write asíncrono del descuento de stock en Supabase (no bloqueante)
      if (product.uuid) {
        handleDualWrite(
          supabaseProductService.updateStockByUuid(product.uuid, nuevoStock),
          'productos',
          'UPDATE_STOCK',
          { uuid: product.uuid, stock: nuevoStock, id }
        );
      }

      return { success: true, total, id: ventaId };

    } catch (err) {
      console.error('[SaleService] Error en sellProduct:', err);
      if (typeof registrarAccion === 'function') {
        try {
          registrarAccion('Error Venta', `Error: ${err.message}`);
        } catch (e) {}
      }
      return { success: false, error: err.message };
    }
  }

  // ── upsertSale (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ────────────
  /**
   * Inserta o actualiza (UPSERT) una venta en SQLite local basándose en su ID.
   * Utilizado para sincronización entrante desde Supabase hacia la base de datos local.
   * 
   * @param {object} venta - Objeto con datos de la venta (debe contener id).
   * @returns {{ success: boolean, id?: number, error?: string }}
   */
  function upsertSale(venta) {
    if (!venta || !venta.id) {
      return { success: false, error: 'ID de venta requerido para UPSERT.' };
    }

    const prodId = venta.producto_id ? Number(venta.producto_id) : null;
    const clientTxId = venta.client_transaction_id || null;
    const vUuid = venta.uuid || null;
    const prodUuid = venta.producto_uuid || null;
    const ticketUuid = venta.ticket_uuid || null;

    if (clientTxId) {
      try {
        const existingLocal = db.prepare(`
          SELECT id FROM ventas
          WHERE client_transaction_id = ? AND (producto_id = ? OR (producto_id IS NULL AND ? IS NULL))
        `).get(clientTxId, prodId, prodId);

        if (existingLocal && Number(existingLocal.id) !== Number(venta.id)) {
          const localId = Number(existingLocal.id);
          const remoteId = Number(venta.id);

          db.transaction(() => {
            db.prepare('DELETE FROM ventas WHERE id = ?').run(localId);
            const stmt = db.prepare(`
              INSERT INTO ventas (id, producto_id, cantidad, total, metodo_pago, cliente, fecha, client_transaction_id, uuid, producto_uuid, ticket_uuid)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                producto_id = excluded.producto_id,
                cantidad = excluded.cantidad,
                total = excluded.total,
                metodo_pago = excluded.metodo_pago,
                cliente = excluded.cliente,
                fecha = excluded.fecha,
                client_transaction_id = excluded.client_transaction_id,
                uuid = COALESCE(excluded.uuid, ventas.uuid),
                producto_uuid = COALESCE(excluded.producto_uuid, ventas.producto_uuid),
                ticket_uuid = COALESCE(excluded.ticket_uuid, ventas.ticket_uuid)
            `);
            stmt.run(
              remoteId,
              prodId,
              venta.cantidad !== undefined ? Number(venta.cantidad) : 1,
              venta.total !== undefined ? Number(venta.total) : 0,
              venta.metodo_pago || 'Efectivo',
              venta.cliente || 'Consumidor Final',
              venta.fecha || new Date().toISOString(),
              clientTxId,
              vUuid,
              prodUuid,
              ticketUuid
            );
          })();

          console.log(`[SaleService] 🔄 Reconciliación de venta offline completada: Local #${localId} ➔ Remoto #${remoteId} (UUID: ${clientTxId})`);
          return { success: true, id: remoteId, reconciledFrom: localId };
        }
      } catch (recErr) {
        console.warn('[SaleService] Error en verificación de reconciliación de ventas:', recErr.message);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO ventas (id, producto_id, cantidad, total, metodo_pago, cliente, fecha, client_transaction_id, uuid, producto_uuid, ticket_uuid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        producto_id = excluded.producto_id,
        cantidad = excluded.cantidad,
        total = excluded.total,
        metodo_pago = excluded.metodo_pago,
        cliente = excluded.cliente,
        fecha = excluded.fecha,
        client_transaction_id = excluded.client_transaction_id,
        uuid = COALESCE(excluded.uuid, ventas.uuid),
        producto_uuid = COALESCE(excluded.producto_uuid, ventas.producto_uuid),
        ticket_uuid = COALESCE(excluded.ticket_uuid, ventas.ticket_uuid)
    `);

    stmt.run(
      Number(venta.id),
      prodId,
      venta.cantidad !== undefined ? Number(venta.cantidad) : 1,
      venta.total !== undefined ? Number(venta.total) : 0,
      venta.metodo_pago || 'Efectivo',
      venta.cliente || 'Consumidor Final',
      venta.fecha || new Date().toISOString(),
      clientTxId,
      vUuid,
      prodUuid,
      ticketUuid
    );

    return { success: true, id: Number(venta.id) };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getSales,
    sellProduct,
    upsertSale
  };
}

module.exports = createSaleService;
