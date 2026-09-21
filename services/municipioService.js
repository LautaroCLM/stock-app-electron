// services/municipioService.js
//
// Servicio para el módulo de Municipio (Órdenes y Pagos).
// Encapsula las operaciones de datos en SQLite local e integra Dual Write a Supabase.

'use strict';

const supabaseMunicipioService = require('./supabaseMunicipioService');
const supabaseProductService = require('./supabaseProductService');

/**
 * Fábrica del servicio de Municipio.
 * @param {import('better-sqlite3').Database} db - Instancia de SQLite local.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con la API pública del servicio.
 */
function createMunicipioService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[MunicipioService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[MunicipioService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[MunicipioService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── ORDENES MUNICIPIO ───────────────────────────────────────────────────────
  function getOrders() {
    return db.prepare('SELECT * FROM municipio_ordenes ORDER BY fecha DESC, created_at DESC').all();
  }

  function addOrder(order) {
    const transaction = db.transaction(() => {
      const total = parseFloat(order.total) || 0;
      const productosArr = Array.isArray(order.productos) ? order.productos : [];

      const info = db.prepare(`
        INSERT INTO municipio_ordenes (fecha, expediente, orden_compra, fecha_estimada_cobro, observaciones, total, saldo_pendiente, estado, productos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        order.fecha,
        order.expediente || null,
        order.orden_compra || null,
        order.fecha_estimada_cobro || null,
        order.observaciones || null,
        total,
        total,
        'Pendiente',
        JSON.stringify(productosArr)
      );

      const orderId = info.lastInsertRowid;

      // Descontar stock de productos localmente y disparar Dual Write de stock
      for (const p of productosArr) {
        if (p.id) {
          const currentProd = db.prepare('SELECT uuid, stock, nombre FROM productos WHERE id = ?').get(p.id);
          if (currentProd) {
            const newStock = Math.max(0, currentProd.stock - p.cantidad);
            db.prepare('UPDATE productos SET stock = ? WHERE id = ?').run(newStock, p.id);
            
            if (typeof registrarAccion === 'function') {
              registrarAccion(
                'Venta Municipio', 
                `Descuento de ${p.cantidad} unidades del producto ${currentProd.nombre} (Orden #${orderId})`
              );
            }

            if (currentProd.uuid) {
              handleDualWrite(
                supabaseProductService.updateStockByUuid(currentProd.uuid, newStock),
                'productos',
                'UPDATE_STOCK',
                { uuid: currentProd.uuid, stock: newStock, id: p.id }
              );
            }
          }
        }
      }

      const payload = {
        id: orderId,
        fecha: order.fecha,
        expediente: order.expediente || null,
        orden_compra: order.orden_compra || null,
        fecha_estimada_cobro: order.fecha_estimada_cobro || null,
        observaciones: order.observaciones || null,
        total,
        saldo_pendiente: total,
        estado: 'Pendiente',
        productos: productosArr
      };

      handleDualWrite(
        supabaseMunicipioService.addOrder(payload),
        'municipio_ordenes',
        'INSERT',
        payload
      );

      return { success: true, id: orderId };
    });

    return transaction();
  }

  function deleteOrder(id) {
    if (!id) return { success: false, error: 'ID de orden requerido.' };

    db.prepare('DELETE FROM municipio_ordenes WHERE id = ?').run(id);

    if (typeof registrarAccion === 'function') {
      registrarAccion('Eliminación Orden Municipio', `Orden #${id} eliminada.`);
    }

    handleDualWrite(
      supabaseMunicipioService.deleteOrder(id),
      'municipio_ordenes',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  function upsertOrder(order) {
    if (!order || !order.id) return { success: false, error: 'ID de orden requerido.' };

    let productosStr = '[]';
    if (typeof order.productos === 'string') {
      productosStr = order.productos;
    } else if (Array.isArray(order.productos) || typeof order.productos === 'object') {
      productosStr = JSON.stringify(order.productos || []);
    }

    const stmt = db.prepare(`
      INSERT INTO municipio_ordenes (id, fecha, expediente, orden_compra, fecha_estimada_cobro, observaciones, total, saldo_pendiente, estado, productos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        fecha = excluded.fecha,
        expediente = excluded.expediente,
        orden_compra = excluded.orden_compra,
        fecha_estimada_cobro = excluded.fecha_estimada_cobro,
        observaciones = excluded.observaciones,
        total = excluded.total,
        saldo_pendiente = excluded.saldo_pendiente,
        estado = excluded.estado,
        productos = excluded.productos
    `);

    stmt.run(
      Number(order.id),
      order.fecha || new Date().toISOString().split('T')[0],
      order.expediente || null,
      order.orden_compra || null,
      order.fecha_estimada_cobro || null,
      order.observaciones || null,
      order.total !== undefined ? Number(order.total) : 0,
      order.saldo_pendiente !== undefined ? Number(order.saldo_pendiente) : Number(order.total || 0),
      order.estado || 'Pendiente',
      productosStr
    );

    return { success: true, id: Number(order.id) };
  }

  // ── PAGOS MUNICIPIO ────────────────────────────────────────────────────────
  function getPayments(ordenId) {
    return db.prepare('SELECT * FROM municipio_pagos WHERE orden_id = ? ORDER BY fecha DESC, created_at DESC').all(ordenId);
  }

  function addPayment(pago) {
    const transaction = db.transaction(() => {
      const orden = db.prepare('SELECT total, saldo_pendiente FROM municipio_ordenes WHERE id = ?').get(pago.orden_id);
      if (!orden) {
        throw new Error('Orden no encontrada');
      }

      const monto = parseFloat(pago.monto) || 0;

      const info = db.prepare(`
        INSERT INTO municipio_pagos (orden_id, fecha, monto, metodo_pago, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        pago.orden_id,
        pago.fecha,
        monto,
        pago.metodo_pago || 'Transferencia',
        pago.observaciones || null
      );

      const pagoId = info.lastInsertRowid;

      const nuevoSaldo = Math.max(0, orden.saldo_pendiente - monto);
      let nuevoEstado = 'Pendiente';
      if (nuevoSaldo === 0) {
        nuevoEstado = 'Cobrado';
      } else if (nuevoSaldo < orden.total) {
        nuevoEstado = 'Pago parcial';
      }

      db.prepare(`
        UPDATE municipio_ordenes
        SET saldo_pendiente = ?, estado = ?
        WHERE id = ?
      `).run(nuevoSaldo, nuevoEstado, pago.orden_id);

      if (typeof registrarAccion === 'function') {
        registrarAccion(
          'Cobro Municipio', 
          `Cobro de $${monto} registrado para la Orden #${pago.orden_id}. Saldo restante: $${nuevoSaldo}`
        );
      }

      const payloadPago = {
        id: pagoId,
        orden_id: Number(pago.orden_id),
        fecha: pago.fecha,
        monto,
        metodo_pago: pago.metodo_pago || 'Transferencia',
        observaciones: pago.observaciones || null
      };

      handleDualWrite(
        supabaseMunicipioService.addPayment(payloadPago),
        'municipio_pagos',
        'INSERT',
        payloadPago
      );

      // Replicar actualización del estado/saldo de la orden en Supabase
      const ordenActualizada = db.prepare('SELECT * FROM municipio_ordenes WHERE id = ?').get(pago.orden_id);
      if (ordenActualizada) {
        handleDualWrite(
          supabaseMunicipioService.addOrder(ordenActualizada),
          'municipio_ordenes',
          'INSERT',
          ordenActualizada
        );
      }

      return { success: true, id: pagoId };
    });

    return transaction();
  }

  function deletePayment(id) {
    if (!id) return { success: false, error: 'ID de pago requerido.' };

    db.prepare('DELETE FROM municipio_pagos WHERE id = ?').run(id);

    handleDualWrite(
      supabaseMunicipioService.deletePayment(id),
      'municipio_pagos',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  function upsertPayment(pago) {
    if (!pago || !pago.id) return { success: false, error: 'ID de pago requerido.' };

    const stmt = db.prepare(`
      INSERT INTO municipio_pagos (id, orden_id, fecha, monto, metodo_pago, observaciones)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        orden_id = excluded.orden_id,
        fecha = excluded.fecha,
        monto = excluded.monto,
        metodo_pago = excluded.metodo_pago,
        observaciones = excluded.observaciones
    `);

    stmt.run(
      Number(pago.id),
      Number(pago.orden_id),
      pago.fecha || new Date().toISOString().split('T')[0],
      pago.monto !== undefined ? Number(pago.monto) : 0,
      pago.metodo_pago || 'Transferencia',
      pago.observaciones || null
    );

    return { success: true, id: Number(pago.id) };
  }

  // ── METRICAS Y PROXIMOS COBROS ──────────────────────────────────────────────
  function getUpcomingCollections() {
    return db.prepare("SELECT * FROM municipio_ordenes WHERE saldo_pendiente > 0 ORDER BY fecha_estimada_cobro ASC").all();
  }

  function getStats() {
    const totalVendido = db.prepare("SELECT COALESCE(SUM(total), 0) as n FROM municipio_ordenes").get().n;
    const totalPendiente = db.prepare("SELECT COALESCE(SUM(saldo_pendiente), 0) as n FROM municipio_ordenes").get().n;
    const totalCobrado = totalVendido - totalPendiente;
    
    const cantOrdenes = db.prepare("SELECT COUNT(*) as n FROM municipio_ordenes").get().n;
    const cantPendientes = db.prepare("SELECT COUNT(*) as n FROM municipio_ordenes WHERE estado != 'Cobrado'").get().n;
    const cantCobradas = db.prepare("SELECT COUNT(*) as n FROM municipio_ordenes WHERE estado = 'Cobrado'").get().n;

    return {
      totalVendido,
      totalPendiente,
      totalCobrado,
      cantOrdenes,
      cantPendientes,
      cantCobradas
    };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getOrders,
    addOrder,
    deleteOrder,
    upsertOrder,
    getPayments,
    addPayment,
    deletePayment,
    upsertPayment,
    getUpcomingCollections,
    getStats
  };
}

module.exports = createMunicipioService;
