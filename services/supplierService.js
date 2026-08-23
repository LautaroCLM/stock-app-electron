// services/supplierService.js
//
// Fase 0.1 — Capa de servicio para el módulo de Proveedores.
// Centraliza el acceso a datos de proveedores, compras, pagos y cuenta corriente.
//
// Por ahora solo envuelve el acceso a SQLite existente.
// En el futuro, este será el único archivo que cambie cuando
// la fuente de datos migre a un backend online.
//
// Uso:
//   const supplierService = require('./services/supplierService')(db, registrarAccion);

'use strict';

const CONFIG = require('./config');
const supabaseSupplierService = require('./supabaseSupplierService');
const supabasePurchaseService = require('./supabasePurchaseService');

/**
 * Fábrica del servicio de Proveedores.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos.
 * @param {function(string, string): void} registrarAccion - Función de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio.
 */
function createSupplierService(db, registrarAccion, syncManager = null) {

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[SupplierService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[SupplierService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── getSuppliers ──────────────────────────────────────────────────────────
  async function getSuppliers() {
    if (CONFIG.APP_MODE === 'ONLINE') {
      console.log('[SupplierService] Modo ONLINE activo: obteniendo proveedores desde Supabase.');
      return await supabaseSupplierService.getAllSuppliers();
    }

    console.log('[SupplierService] Modo LOCAL activo: obteniendo proveedores desde SQLite.');
    return db.prepare(`
      SELECT p.*,
        COALESCE((SELECT SUM(debito) - SUM(credito) FROM cuenta_corriente_proveedor WHERE proveedor_id = p.id), 0) AS deuda_actual,
        (SELECT fecha FROM compras_proveedor WHERE proveedor_id = p.id ORDER BY fecha DESC LIMIT 1) AS ultima_compra
      FROM proveedores p
      ORDER BY p.razon_social ASC
    `).all();
  }

  // ── addSupplier ───────────────────────────────────────────────────────────
  function addSupplier(prov) {
    const exists = db.prepare('SELECT id FROM proveedores WHERE razon_social = ? COLLATE NOCASE').get(prov.razon_social?.trim());
    if (exists) return { success: false, error: 'Ya existe un proveedor con esa razón social.' };

    const info = db.prepare(`
      INSERT INTO proveedores (razon_social, contacto, telefono, email, direccion, ciudad, provincia, cuit, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prov.razon_social?.trim() || '',
      prov.contacto || null,
      prov.telefono || null,
      prov.email || null,
      prov.direccion || null,
      prov.ciudad || null,
      prov.provincia || null,
      prov.cuit || null,
      prov.observaciones || null,
      prov.estado || 'Activo'
    );

    const newId = info.lastInsertRowid;

    if (typeof registrarAccion === 'function') {
      registrarAccion('Agregar proveedor', `Proveedor: ${prov.razon_social}`);
    }

    // Dual Write asíncrono a Supabase (no bloqueante)
    handleDualWrite(
      supabaseSupplierService.addSupplier({ ...prov, id: newId }),
      'proveedores',
      'INSERT',
      { ...prov, id: newId }
    );

    return { success: true, id: newId };
  }

  // ── updateSupplier ────────────────────────────────────────────────────────
  function updateSupplier(prov) {
    const exists = db.prepare('SELECT id FROM proveedores WHERE razon_social = ? COLLATE NOCASE AND id != ?').get(prov.razon_social?.trim(), prov.id);
    if (exists) return { success: false, error: 'Ya existe otro proveedor con esa razón social.' };

    const info = db.prepare(`
      UPDATE proveedores SET
        razon_social=?, contacto=?, telefono=?, email=?, direccion=?,
        ciudad=?, provincia=?, cuit=?, observaciones=?, estado=?
      WHERE id=?
    `).run(
      prov.razon_social?.trim() || '',
      prov.contacto || null,
      prov.telefono || null,
      prov.email || null,
      prov.direccion || null,
      prov.ciudad || null,
      prov.provincia || null,
      prov.cuit || null,
      prov.observaciones || null,
      prov.estado || 'Activo',
      prov.id
    );

    if (info.changes > 0) {
      if (typeof registrarAccion === 'function') {
        registrarAccion('Editar proveedor', `Proveedor ID: ${prov.id}, Nombre: ${prov.razon_social}`);
      }

      // Dual Write asíncrono a Supabase (no bloqueante)
      handleDualWrite(
        supabaseSupplierService.updateSupplier(prov),
        'proveedores',
        'UPDATE',
        prov
      );
    }

    return { success: info.changes > 0 };
  }

  // ── deleteSupplier ────────────────────────────────────────────────────────
  function deleteSupplier(id) {
    const prov = db.prepare('SELECT razon_social FROM proveedores WHERE id=?').get(id);
    const info = db.prepare('DELETE FROM proveedores WHERE id=?').run(id);

    if (info.changes > 0) {
      if (typeof registrarAccion === 'function') {
        registrarAccion('Eliminar proveedor', `Proveedor ID: ${id}, Nombre: ${prov?.razon_social}`);
      }

      // Dual Write asíncrono a Supabase (no bloqueante)
      handleDualWrite(
        supabaseSupplierService.deleteSupplier(id),
        'proveedores',
        'DELETE',
        { id }
      );
    }

    return { success: info.changes > 0 };
  }

  // ── getPurchases ──────────────────────────────────────────────────────────
  function getPurchases(proveedorId) {
    let sql = `
      SELECT c.*, p.razon_social as proveedor_nombre
      FROM compras_proveedor c
      JOIN proveedores p ON c.proveedor_id = p.id
    `;
    const params = [];
    if (proveedorId) { sql += ' WHERE c.proveedor_id = ?'; params.push(proveedorId); }
    sql += ' ORDER BY c.fecha DESC, c.created_at DESC';
    return db.prepare(sql).all(params);
  }

  // ── addPurchase ───────────────────────────────────────────────────────────
  function addPurchase(compra) {
    const insertCompra = db.prepare(`
      INSERT INTO compras_proveedor (proveedor_id, fecha, descripcion, total, metodo_pago, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const esCuentaCorriente = compra.metodo_pago === 'Cuenta corriente';
    const estadoCompra = esCuentaCorriente ? 'Pendiente' : 'Pagado';

    const info = insertCompra.run(
      compra.proveedor_id,
      compra.fecha,
      compra.descripcion || null,
      parseFloat(compra.total) || 0,
      compra.metodo_pago || 'Efectivo',
      estadoCompra,
      compra.observaciones || null
    );

    const compraId = info.lastInsertRowid;

    if (esCuentaCorriente) {
      const movInfo = db.prepare(`
        INSERT INTO cuenta_corriente_proveedor (proveedor_id, fecha, tipo, descripcion, debito, credito, referencia_id, fecha_vencimiento, estado_pago)
        VALUES (?, ?, 'Compra', ?, ?, 0, ?, ?, 'Pendiente')
      `).run(
        compra.proveedor_id,
        compra.fecha,
        compra.descripcion || `Compra #${compraId}`,
        parseFloat(compra.total) || 0,
        compraId,
        compra.fecha_vencimiento || null
      );

      // Dual Write movimiento cta. cte.
      handleDualWrite(
        supabasePurchaseService.addAccountMovement({
          id: movInfo.lastInsertRowid,
          proveedor_id: compra.proveedor_id,
          fecha: compra.fecha,
          tipo: 'Compra',
          descripcion: compra.descripcion || `Compra #${compraId}`,
          debito: parseFloat(compra.total) || 0,
          credito: 0,
          referencia_id: compraId,
          fecha_vencimiento: compra.fecha_vencimiento || null,
          estado_pago: 'Pendiente'
        }),
        'cuenta_corriente_proveedor',
        'INSERT',
        {
          id: movInfo.lastInsertRowid,
          proveedor_id: compra.proveedor_id,
          fecha: compra.fecha,
          tipo: 'Compra',
          descripcion: compra.descripcion || `Compra #${compraId}`,
          debito: parseFloat(compra.total) || 0,
          credito: 0,
          referencia_id: compraId,
          fecha_vencimiento: compra.fecha_vencimiento || null,
          estado_pago: 'Pendiente'
        }
      );
    }

    registrarAccion('Registrar compra proveedor', `Proveedor ID: ${compra.proveedor_id}, Total: $${compra.total}`);

    // Dual Write compra
    handleDualWrite(
      supabasePurchaseService.addPurchase({
        id: compraId,
        proveedor_id: compra.proveedor_id,
        fecha: compra.fecha,
        descripcion: compra.descripcion || null,
        total: parseFloat(compra.total) || 0,
        metodo_pago: compra.metodo_pago || 'Efectivo',
        estado: estadoCompra,
        observaciones: compra.observaciones || null
      }),
      'compras_proveedor',
      'INSERT',
      {
        id: compraId,
        proveedor_id: compra.proveedor_id,
        fecha: compra.fecha,
        descripcion: compra.descripcion || null,
        total: parseFloat(compra.total) || 0,
        metodo_pago: compra.metodo_pago || 'Efectivo',
        estado: estadoCompra,
        observaciones: compra.observaciones || null
      }
    );

    return { success: true, id: compraId };
  }

  // ── deletePurchase ────────────────────────────────────────────────────────
  function deletePurchase(id) {
    db.prepare('DELETE FROM cuenta_corriente_proveedor WHERE referencia_id=? AND tipo="Compra"').run(id);
    const info = db.prepare('DELETE FROM compras_proveedor WHERE id=?').run(id);

    if (info.changes > 0) {
      handleDualWrite(
        supabasePurchaseService.deleteAccountMovementByRef(id, 'Compra'),
        'cuenta_corriente_proveedor',
        'DELETE',
        { referencia_id: id, tipo: 'Compra' }
      );
      handleDualWrite(
        supabasePurchaseService.deletePurchase(id),
        'compras_proveedor',
        'DELETE',
        { id }
      );
    }

    return { success: info.changes > 0 };
  }

  // ── getPayments ───────────────────────────────────────────────────────────
  function getPayments(proveedorId) {
    let sql = `
      SELECT pg.*, p.razon_social as proveedor_nombre
      FROM pagos_proveedor pg
      JOIN proveedores p ON pg.proveedor_id = p.id
    `;
    const params = [];
    if (proveedorId) { sql += ' WHERE pg.proveedor_id = ?'; params.push(proveedorId); }
    sql += ' ORDER BY pg.fecha DESC, pg.created_at DESC';
    return db.prepare(sql).all(params);
  }

  // ── addPayment ────────────────────────────────────────────────────────────
  function addPayment(pago) {
    const infoPago = db.prepare(`
      INSERT INTO pagos_proveedor (proveedor_id, compra_id, fecha, monto, metodo_pago, comprobante, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      pago.proveedor_id,
      pago.compra_id || null,
      pago.fecha,
      parseFloat(pago.monto) || 0,
      pago.metodo_pago || 'Efectivo',
      pago.comprobante || null,
      pago.observaciones || null
    );

    const pagoId = infoPago.lastInsertRowid;
    const movInfo = db.prepare(`
      INSERT INTO cuenta_corriente_proveedor (proveedor_id, fecha, tipo, descripcion, debito, credito, referencia_id, estado_pago)
      VALUES (?, ?, 'Pago', ?, 0, ?, ?, 'Pagado')
    `).run(
      pago.proveedor_id,
      pago.fecha,
      pago.observaciones || `Pago #${pagoId}`,
      parseFloat(pago.monto) || 0,
      pagoId
    );

    if (pago.compra_id) {
      const compraObj = db.prepare('SELECT total FROM compras_proveedor WHERE id = ?').get(pago.compra_id);
      if (compraObj) {
        const totalPagado = db.prepare('SELECT COALESCE(SUM(monto), 0) as total FROM pagos_proveedor WHERE compra_id = ?').get(pago.compra_id).total;
        
        let nuevoEstado = 'Pendiente';
        if (totalPagado >= compraObj.total) {
          nuevoEstado = 'Pagado';
        } else if (totalPagado > 0) {
          nuevoEstado = 'Parcial';
        }
        
        db.prepare("UPDATE compras_proveedor SET estado = ? WHERE id = ?").run(nuevoEstado, pago.compra_id);
        db.prepare("UPDATE cuenta_corriente_proveedor SET estado_pago = ? WHERE referencia_id = ? AND tipo = 'Compra'").run(nuevoEstado, pago.compra_id);
      }
    }

    registrarAccion('Registrar pago proveedor', `Proveedor ID: ${pago.proveedor_id}, Monto: $${pago.monto}`);

    // Dual Write pago
    handleDualWrite(
      supabasePurchaseService.addPayment({
        id: pagoId,
        proveedor_id: pago.proveedor_id,
        compra_id: pago.compra_id || null,
        fecha: pago.fecha,
        monto: parseFloat(pago.monto) || 0,
        metodo_pago: pago.metodo_pago || 'Efectivo',
        comprobante: pago.comprobante || null,
        observaciones: pago.observaciones || null
      }),
      'pagos_proveedor',
      'INSERT',
      {
        id: pagoId,
        proveedor_id: pago.proveedor_id,
        compra_id: pago.compra_id || null,
        fecha: pago.fecha,
        monto: parseFloat(pago.monto) || 0,
        metodo_pago: pago.metodo_pago || 'Efectivo',
        comprobante: pago.comprobante || null,
        observaciones: pago.observaciones || null
      }
    );

    // Dual Write movimiento cta. cte.
    handleDualWrite(
      supabasePurchaseService.addAccountMovement({
        id: movInfo.lastInsertRowid,
        proveedor_id: pago.proveedor_id,
        fecha: pago.fecha,
        tipo: 'Pago',
        descripcion: pago.observaciones || `Pago #${pagoId}`,
        debito: 0,
        credito: parseFloat(pago.monto) || 0,
        referencia_id: pagoId,
        estado_pago: 'Pagado'
      }),
      'cuenta_corriente_proveedor',
      'INSERT',
      {
        id: movInfo.lastInsertRowid,
        proveedor_id: pago.proveedor_id,
        fecha: pago.fecha,
        tipo: 'Pago',
        descripcion: pago.observaciones || `Pago #${pagoId}`,
        debito: 0,
        credito: parseFloat(pago.monto) || 0,
        referencia_id: pagoId,
        estado_pago: 'Pagado'
      }
    );

    return { success: true, id: pagoId };
  }

  // ── deletePayment ─────────────────────────────────────────────────────────
  function deletePayment(id) {
    const pagoObj = db.prepare('SELECT compra_id FROM pagos_proveedor WHERE id = ?').get(id);
    
    db.prepare('DELETE FROM cuenta_corriente_proveedor WHERE referencia_id=? AND tipo="Pago"').run(id);
    const info = db.prepare('DELETE FROM pagos_proveedor WHERE id=?').run(id);

    if (pagoObj && pagoObj.compra_id) {
      const compraObj = db.prepare('SELECT total FROM compras_proveedor WHERE id = ?').get(pagoObj.compra_id);
      if (compraObj) {
        const totalPagado = db.prepare('SELECT COALESCE(SUM(monto), 0) as total FROM pagos_proveedor WHERE compra_id = ?').get(pagoObj.compra_id).total;
        
        let nuevoEstado = 'Pendiente';
        if (totalPagado >= compraObj.total) {
          nuevoEstado = 'Pagado';
        } else if (totalPagado > 0) {
          nuevoEstado = 'Parcial';
        }
        
        db.prepare("UPDATE compras_proveedor SET estado = ? WHERE id = ?").run(nuevoEstado, pagoObj.compra_id);
        db.prepare("UPDATE cuenta_corriente_proveedor SET estado_pago = ? WHERE referencia_id = ? AND tipo = 'Compra'").run(nuevoEstado, pagoObj.compra_id);
      }
    }

    if (info.changes > 0) {
      handleDualWrite(
        supabasePurchaseService.deleteAccountMovementByRef(id, 'Pago'),
        'cuenta_corriente_proveedor',
        'DELETE',
        { referencia_id: id, tipo: 'Pago' }
      );
      handleDualWrite(
        supabasePurchaseService.deletePayment(id),
        'pagos_proveedor',
        'DELETE',
        { id }
      );
    }

    return { success: info.changes > 0 };
  }

  // ── getCurrentAccount ─────────────────────────────────────────────────────
  function getCurrentAccount(proveedorId) {
    const rows = db.prepare(`
      SELECT * FROM cuenta_corriente_proveedor
      WHERE proveedor_id = ?
      ORDER BY fecha ASC, created_at ASC
    `).all(proveedorId);

    let saldo = 0;
    return rows.map(r => {
      saldo += (r.debito || 0) - (r.credito || 0);
      return { ...r, saldo_acumulado: saldo };
    });
  }

  // ── addAccountMovement ────────────────────────────────────────────────────
  function addAccountMovement(mov) {
    const info = db.prepare(`
      INSERT INTO cuenta_corriente_proveedor (proveedor_id, fecha, tipo, descripcion, debito, credito, fecha_vencimiento, estado_pago)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mov.proveedor_id,
      mov.fecha,
      mov.tipo || 'Ajuste',
      mov.descripcion || null,
      parseFloat(mov.debito) || 0,
      parseFloat(mov.credito) || 0,
      mov.fecha_vencimiento || null,
      mov.estado_pago || 'Pendiente'
    );

    const movId = info.lastInsertRowid;
    handleDualWrite(
      supabasePurchaseService.addAccountMovement({
        id: movId,
        proveedor_id: mov.proveedor_id,
        fecha: mov.fecha,
        tipo: mov.tipo || 'Ajuste',
        descripcion: mov.descripcion || null,
        debito: parseFloat(mov.debito) || 0,
        credito: parseFloat(mov.credito) || 0,
        fecha_vencimiento: mov.fecha_vencimiento || null,
        estado_pago: mov.estado_pago || 'Pendiente'
      }),
      'cuenta_corriente_proveedor',
      'INSERT',
      {
        id: movId,
        proveedor_id: mov.proveedor_id,
        fecha: mov.fecha,
        tipo: mov.tipo || 'Ajuste',
        descripcion: mov.descripcion || null,
        debito: parseFloat(mov.debito) || 0,
        credito: parseFloat(mov.credito) || 0,
        fecha_vencimiento: mov.fecha_vencimiento || null,
        estado_pago: mov.estado_pago || 'Pendiente'
      }
    );

    return { success: true, id: movId };
  }

  // ── getSupplierStats ──────────────────────────────────────────────────────
  function getSupplierStats() {
    const now = new Date();
    const primerDiaMes = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const hoy = now.toISOString().split('T')[0];

    const totalProveedores = db.prepare("SELECT COUNT(*) as n FROM proveedores WHERE estado='Activo'").get().n;
    const totalDeuda = db.prepare("SELECT COALESCE(SUM(debito)-SUM(credito),0) as v FROM cuenta_corriente_proveedor").get().v;
    
    const deudasVencidasRows = db.prepare(`
      SELECT id, debito, referencia_id
      FROM cuenta_corriente_proveedor
      WHERE fecha_vencimiento IS NOT NULL
        AND fecha_vencimiento < ?
        AND estado_pago != 'Pagado'
        AND tipo = 'Compra'
    `).all(hoy);

    let deudasVencidas = 0;
    for (const r of deudasVencidasRows) {
      const pagos = db.prepare('SELECT COALESCE(SUM(monto), 0) as total FROM pagos_proveedor WHERE compra_id = ?').get(r.referencia_id).total;
      deudasVencidas += Math.max(0, r.debito - pagos);
    }

    const comprasMes = db.prepare("SELECT COALESCE(SUM(total),0) as v FROM compras_proveedor WHERE fecha >= ?").get(primerDiaMes).v;
    const pagosMes = db.prepare("SELECT COALESCE(SUM(monto),0) as v FROM pagos_proveedor WHERE fecha >= ?").get(primerDiaMes).v;
    const topProveedor = db.prepare("SELECT p.razon_social, SUM(c.total) as total FROM compras_proveedor c JOIN proveedores p ON c.proveedor_id=p.id GROUP BY c.proveedor_id ORDER BY total DESC LIMIT 1").get();

    const comprasPorMes = db.prepare(`
      SELECT strftime('%Y-%m', fecha) as mes, SUM(total) as total
      FROM compras_proveedor
      WHERE fecha >= date('now', '-6 months')
      GROUP BY mes ORDER BY mes ASC
    `).all();

    return { totalProveedores, totalDeuda, deudasVencidas, comprasMes, pagosMes, topProveedor, comprasPorMes };
  }

  // ── getUpcomingDueDates ───────────────────────────────────────────────────
  function getUpcomingDueDates() {
    const rows = db.prepare(`
      SELECT cc.*, p.razon_social as proveedor_nombre
      FROM cuenta_corriente_proveedor cc
      JOIN proveedores p ON cc.proveedor_id = p.id
      WHERE cc.fecha_vencimiento IS NOT NULL
        AND cc.estado_pago != 'Pagado'
        AND cc.tipo = 'Compra'
      ORDER BY cc.fecha_vencimiento ASC
    `).all();

    return rows.map(r => {
      const pagos = db.prepare('SELECT COALESCE(SUM(monto), 0) as total FROM pagos_proveedor WHERE compra_id = ?').get(r.referencia_id).total;
      const saldoPendiente = r.debito - pagos;
      return {
        ...r,
        saldo_pendiente: saldoPendiente
      };
    }).filter(r => r.saldo_pendiente > 0);
  }

  // ── getPendingDebts ───────────────────────────────────────────────────────
  function getPendingDebts(proveedorId) {
    const rows = db.prepare(`
      SELECT cc.*, p.razon_social as proveedor_nombre
      FROM cuenta_corriente_proveedor cc
      JOIN proveedores p ON cc.proveedor_id = p.id
      WHERE cc.proveedor_id = ?
        AND cc.tipo = 'Compra'
        AND cc.estado_pago != 'Pagado'
      ORDER BY cc.fecha ASC, cc.created_at ASC
    `).all(proveedorId);

    return rows.map(r => {
      const pagos = db.prepare('SELECT COALESCE(SUM(monto), 0) as total FROM pagos_proveedor WHERE compra_id = ?').get(r.referencia_id).total;
      const saldoPendiente = r.debito - pagos;
      return {
        ...r,
        saldo_pendiente: saldoPendiente
      };
    }).filter(r => r.saldo_pendiente > 0);
  }

  // ── upsertSupplier (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ────────
  /**
   * Inserta o actualiza (UPSERT) un proveedor en SQLite local basándose en su ID.
   * Utilizado para sincronización entrante desde Supabase hacia la base de datos local.
   * 
   * @param {object} prov - Objeto con datos del proveedor (debe contener id).
   * @returns {{ success: boolean, id?: number, error?: string }}
   */
  function upsertSupplier(prov) {
    if (!prov || !prov.id) {
      return { success: false, error: 'ID de proveedor requerido para UPSERT.' };
    }

    const stmt = db.prepare(`
      INSERT INTO proveedores (id, razon_social, contacto, telefono, email, direccion, ciudad, provincia, cuit, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        razon_social = excluded.razon_social,
        contacto = excluded.contacto,
        telefono = excluded.telefono,
        email = excluded.email,
        direccion = excluded.direccion,
        ciudad = excluded.ciudad,
        provincia = excluded.provincia,
        cuit = excluded.cuit,
        observaciones = excluded.observaciones,
        estado = excluded.estado
    `);

    stmt.run(
      Number(prov.id),
      prov.razon_social?.trim() || '',
      prov.contacto || null,
      prov.telefono || null,
      prov.email || null,
      prov.direccion || null,
      prov.ciudad || null,
      prov.provincia || null,
      prov.cuit || null,
      prov.observaciones || null,
      prov.estado || 'Activo'
    );

    return { success: true, id: Number(prov.id) };
  }

  // ── upsertPurchase (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ────────
  function upsertPurchase(compra) {
    if (!compra || !compra.id) return { success: false, error: 'ID de compra requerido para UPSERT.' };
    const stmt = db.prepare(`
      INSERT INTO compras_proveedor (id, proveedor_id, fecha, descripcion, total, metodo_pago, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        proveedor_id = excluded.proveedor_id,
        fecha = excluded.fecha,
        descripcion = excluded.descripcion,
        total = excluded.total,
        metodo_pago = excluded.metodo_pago,
        estado = excluded.estado,
        observaciones = excluded.observaciones
    `);
    stmt.run(
      Number(compra.id),
      Number(compra.proveedor_id),
      compra.fecha,
      compra.descripcion || null,
      parseFloat(compra.total) || 0,
      compra.metodo_pago || 'Efectivo',
      compra.estado || 'Pagado',
      compra.observaciones || null
    );
    return { success: true, id: Number(compra.id) };
  }

  // ── upsertPayment (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ─────────
  function upsertPayment(pago) {
    if (!pago || !pago.id) return { success: false, error: 'ID de pago requerido para UPSERT.' };
    const stmt = db.prepare(`
      INSERT INTO pagos_proveedor (id, proveedor_id, compra_id, fecha, monto, metodo_pago, comprobante, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        proveedor_id = excluded.proveedor_id,
        compra_id = excluded.compra_id,
        fecha = excluded.fecha,
        monto = excluded.monto,
        metodo_pago = excluded.metodo_pago,
        comprobante = excluded.comprobante,
        observaciones = excluded.observaciones
    `);
    stmt.run(
      Number(pago.id),
      Number(pago.proveedor_id),
      pago.compra_id ? Number(pago.compra_id) : null,
      pago.fecha,
      parseFloat(pago.monto) || 0,
      pago.metodo_pago || 'Efectivo',
      pago.comprobante || null,
      pago.observaciones || null
    );
    return { success: true, id: Number(pago.id) };
  }

  // ── upsertAccountMovement (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ──
  function upsertAccountMovement(mov) {
    if (!mov || !mov.id) return { success: false, error: 'ID de movimiento requerido para UPSERT.' };
    const stmt = db.prepare(`
      INSERT INTO cuenta_corriente_proveedor (id, proveedor_id, fecha, tipo, descripcion, debito, credito, referencia_id, fecha_vencimiento, estado_pago)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        proveedor_id = excluded.proveedor_id,
        fecha = excluded.fecha,
        tipo = excluded.tipo,
        descripcion = excluded.descripcion,
        debito = excluded.debito,
        credito = excluded.credito,
        referencia_id = excluded.referencia_id,
        fecha_vencimiento = excluded.fecha_vencimiento,
        estado_pago = excluded.estado_pago
    `);
    stmt.run(
      Number(mov.id),
      Number(mov.proveedor_id),
      mov.fecha,
      mov.tipo || 'Ajuste',
      mov.descripcion || null,
      parseFloat(mov.debito) || 0,
      parseFloat(mov.credito) || 0,
      mov.referencia_id ? Number(mov.referencia_id) : null,
      mov.fecha_vencimiento || null,
      mov.estado_pago || 'Pendiente'
    );
    return { success: true, id: Number(mov.id) };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getPurchases,
    addPurchase,
    deletePurchase,
    getPayments,
    addPayment,
    deletePayment,
    getCurrentAccount,
    addAccountMovement,
    getSupplierStats,
    getUpcomingDueDates,
    getPendingDebts,
    upsertSupplier,
    upsertPurchase,
    upsertPayment,
    upsertAccountMovement
  };
}

module.exports = createSupplierService;
