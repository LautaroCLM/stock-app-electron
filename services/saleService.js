// services/saleService.js
//
// Fase 0.1 / Fase 6 — Servicio para el módulo de Ventas.
// Encapsula las operaciones de ventas locales en SQLite e integra Dual Write a Supabase.

'use strict';

const CONFIG = require('./config');
const supabaseSaleService = require('./supabaseSaleService');
const supabaseProductService = require('./supabaseProductService');

/**
 * Fábrica del servicio de Ventas.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio de ventas.
 */
function createSaleService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[SaleService] Instancia de base de datos requerida.');
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
  async function sellProduct({ id, cantidad, metodo_pago = 'Efectivo', carritoCompleto = null, ajuste = null }) {
    try {
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
          const pPrecio = Number(item.precio || 0);
          const pCantidad = Number(item.cantidad || 1);
          const itemSubtotal = pPrecio * pCantidad;
          subtotalVenta += itemSubtotal;
          validItems.push({
            producto_id: Number(item.id),
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
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            total: totalItem
          });
        }

        const result = await supabaseSaleService.processCartSaleAtomic({
          items: payloadItems,
          metodo_pago,
          cliente: 'Consumidor Final'
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        try {
          for (const item of payloadItems) {
            db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(item.cantidad, item.producto_id);
            db.prepare('INSERT INTO ventas (producto_id, cantidad, total, metodo_pago) VALUES (?, ?, ?, ?)').run(
              item.producto_id,
              item.cantidad,
              item.total,
              metodo_pago
            );
          }
        } catch (e) {
          console.warn('[SaleService] No se pudo actualizar el caché SQLite local:', e.message);
        }

        if (typeof registrarAccion === 'function') {
          registrarAccion('Venta (Online)', `Venta atómica procesada en Supabase por $${totalFinalVenta.toFixed(2)}`);
        }

        return { success: true, total: totalFinalVenta };
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
          INSERT INTO ventas (producto_id, cantidad, total, metodo_pago)
          VALUES (?, ?, ?, ?)
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

          const info = insertVenta.run(item.id, item.cantidad, totalItem, metodo_pago);
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
              cliente: 'Consumidor Final'
            }),
            'ventas',
            'INSERT',
            {
              id: ventaId,
              producto_id: item.id,
              cantidad: item.cantidad,
              total: totalItem,
              metodo_pago,
              cliente: 'Consumidor Final'
            }
          );

          // Dual Write asíncrono del descuento de stock en Supabase (no bloqueante)
          handleDualWrite(
            supabaseProductService.updateStock(item.id, nuevoStockItem),
            'productos',
            'UPDATE_STOCK',
            { id: item.id, stock: nuevoStockItem }
          );
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
      if (product.stock < cantidad) return { success: false, error: 'Stock insuficiente' };

      let total = product.precio * cantidad;
      if (ajuste && Number(ajuste.valor) > 0 && total > 0) {
        const valor = Number(ajuste.valor || 0);
        let monto = ajuste.modo === 'percent'
          ? (total * valor / 100)
          : valor;
        if (ajuste.tipo === 'discount') {
          monto = -Math.abs(monto);
        } else {
          monto = Math.abs(monto);
        }
        total = Math.max(0, total + monto);
      }

      const info = db.prepare(`
        INSERT INTO ventas (producto_id, cantidad, total, metodo_pago)
        VALUES (?, ?, ?, ?)
      `).run(id, cantidad, total, metodo_pago);

      const ventaId = info.lastInsertRowid;
      db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(cantidad, id);
      const nuevoStock = product.stock - cantidad;

      if (typeof registrarAccion === 'function') {
        registrarAccion(
          'Venta',
          `Producto: ${product.nombre} | Cantidad: ${cantidad} | Total: $${total.toFixed(2)} | Pago: ${metodo_pago}`
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
          cliente: 'Consumidor Final'
        }),
        'ventas',
        'INSERT',
        {
          id: ventaId,
          producto_id: id,
          cantidad: cantidad,
          total: total,
          metodo_pago,
          cliente: 'Consumidor Final'
        }
      );

      // Dual Write asíncrono del descuento de stock en Supabase (no bloqueante)
      handleDualWrite(
        supabaseProductService.updateStock(id, nuevoStock),
        'productos',
        'UPDATE_STOCK',
        { id, stock: nuevoStock }
      );

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

    const stmt = db.prepare(`
      INSERT INTO ventas (id, producto_id, cantidad, total, metodo_pago, cliente, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        producto_id = excluded.producto_id,
        cantidad = excluded.cantidad,
        total = excluded.total,
        metodo_pago = excluded.metodo_pago,
        cliente = excluded.cliente,
        fecha = excluded.fecha
    `);

    stmt.run(
      Number(venta.id),
      venta.producto_id ? Number(venta.producto_id) : null,
      venta.cantidad !== undefined ? Number(venta.cantidad) : 1,
      venta.total !== undefined ? Number(venta.total) : 0,
      venta.metodo_pago || 'Efectivo',
      venta.cliente || 'Consumidor Final',
      venta.fecha || new Date().toISOString()
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
