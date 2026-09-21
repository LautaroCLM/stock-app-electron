// services/clientService.js
//
// Servicio para el módulo de Clientes y Cuenta Corriente de Clientes.
// Encapsula las operaciones de datos en SQLite local e integra Dual Write a Supabase.

const crypto = require('crypto');
const supabaseClientService = require('./supabaseClientService');
const supabaseProductService = require('./supabaseProductService');

/**
 * Fábrica del servicio de Clientes.
 * @param {import('better-sqlite3').Database} db - Instancia de SQLite local.
 * @param {function(string, string): void} [registrarAccion] - Función opcional de auditoría de main.js.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con la API pública del servicio.
 */
function createClientService(db, registrarAccion, syncManager = null) {
  if (!db) {
    throw new Error('[ClientService] Instancia de base de datos requerida.');
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[ClientService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[ClientService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── CLIENTES ───────────────────────────────────────────────────────────────
  function getClients() {
    return db.prepare('SELECT * FROM clientes ORDER BY id DESC').all();
  }

  function getClientById(id) {
    return db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
  }

  function createClient(data) {
    const uuid = data.uuid || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO clientes (uuid, nombre, telefono, email, direccion, cuit, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      uuid,
      data.nombre || '',
      data.telefono || '',
      data.email || '',
      data.direccion || '',
      data.cuit || '',
      data.observaciones || '',
      data.estado || 'Activo'
    );

    const clientId = info.lastInsertRowid;

    if (typeof registrarAccion === 'function') {
      registrarAccion('Alta Cliente', `Cliente: ${data.nombre} (ID: ${clientId})`);
    }

    const payload = {
      uuid,
      nombre: data.nombre || '',
      telefono: data.telefono || '',
      email: data.email || '',
      direccion: data.direccion || '',
      cuit: data.cuit || '',
      observaciones: data.observaciones || '',
      estado: data.estado || 'Activo'
    };

    handleDualWrite(
      supabaseClientService.addClient(payload),
      'clientes',
      'INSERT',
      payload
    );

    return { success: true, id: clientId, uuid };
  }

  function updateClient(data) {
    if (!data || (!data.id && !data.uuid)) return { success: false, error: 'ID o UUID de cliente requerido.' };

    let uuid = data.uuid;
    if (!uuid && data.id) {
      const existing = db.prepare('SELECT uuid FROM clientes WHERE id = ?').get(data.id);
      uuid = existing?.uuid;
    }
    if (!uuid) {
      uuid = crypto.randomUUID();
    }

    const stmt = db.prepare(`
      UPDATE clientes
      SET uuid = ?, nombre = ?, telefono = ?, email = ?, direccion = ?, cuit = ?, observaciones = ?, estado = ?
      WHERE id = ? OR (uuid IS NOT NULL AND uuid = ?)
    `);

    stmt.run(
      uuid,
      data.nombre || '',
      data.telefono || '',
      data.email || '',
      data.direccion || '',
      data.cuit || '',
      data.observaciones || '',
      data.estado || 'Activo',
      data.id || null,
      uuid
    );

    if (typeof registrarAccion === 'function') {
      registrarAccion('Edición Cliente', `Cliente ID ${data.id} actualizado.`);
    }

    const payload = {
      uuid,
      id: data.id,
      nombre: data.nombre || '',
      telefono: data.telefono || '',
      email: data.email || '',
      direccion: data.direccion || '',
      cuit: data.cuit || '',
      observaciones: data.observaciones || '',
      estado: data.estado || 'Activo'
    };

    handleDualWrite(
      supabaseClientService.updateClient(payload),
      'clientes',
      'UPDATE',
      payload
    );

    return { success: true };
  }

  function deleteClient(target) {
    if (!target) return { success: false, error: 'ID o UUID de cliente requerido.' };

    let cliente;
    if (typeof target === 'object') {
      if (target.id || target.uuid) {
        cliente = db.prepare('SELECT * FROM clientes WHERE id = ? OR uuid = ?').get(target.id || null, target.uuid || null) || target;
      } else {
        cliente = target;
      }
    } else {
      cliente = db.prepare('SELECT * FROM clientes WHERE id = ? OR uuid = ?').get(target, String(target));
    }

    const targetUuid = cliente?.uuid || (typeof target === 'string' && target.includes('-') ? target : null);
    const targetId = cliente?.id || (typeof target === 'number' || (!isNaN(Number(target)) && !String(target).includes('-')) ? Number(target) : null);

    if (cliente && cliente.id) {
      db.prepare('DELETE FROM clientes WHERE id = ?').run(cliente.id);
    } else if (targetId) {
      db.prepare('DELETE FROM clientes WHERE id = ?').run(targetId);
    }

    if (typeof registrarAccion === 'function' && cliente) {
      registrarAccion('Eliminación Cliente', `Cliente: ${cliente.nombre || 'Desconocido'} (ID: ${cliente.id})`);
    }

    const payload = { uuid: targetUuid, id: targetId };

    handleDualWrite(
      supabaseClientService.deleteClient(payload),
      'clientes',
      'DELETE',
      payload
    );

    return { success: true };
  }

  function upsertClient(cliente) {
    if (!cliente || (!cliente.id && !cliente.uuid)) return { success: false, error: 'ID o UUID de cliente requerido.' };

    const uuid = cliente.uuid || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO clientes (id, uuid, nombre, telefono, email, direccion, cuit, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        uuid = COALESCE(excluded.uuid, clientes.uuid),
        nombre = excluded.nombre,
        telefono = excluded.telefono,
        email = excluded.email,
        direccion = excluded.direccion,
        cuit = excluded.cuit,
        observaciones = excluded.observaciones,
        estado = excluded.estado
    `);

    stmt.run(
      cliente.id ? Number(cliente.id) : null,
      uuid,
      cliente.nombre || '',
      cliente.telefono || '',
      cliente.email || '',
      cliente.direccion || '',
      cliente.cuit || '',
      cliente.observaciones || '',
      cliente.estado || 'Activo'
    );

    return { success: true, id: cliente.id ? Number(cliente.id) : null, uuid };
  }

  // ── PAGOS CLIENTE ──────────────────────────────────────────────────────────
  function getPaymentsByClient(clienteId) {
    return db.prepare('SELECT * FROM pagos_cliente WHERE cliente_id = ? ORDER BY fecha DESC, id DESC').all(clienteId);
  }

  function addPayment(data) {
    if (!data || !data.cliente_id) return { success: false, error: 'ID de cliente requerido.' };

    const stmt = db.prepare(`
      INSERT INTO pagos_cliente (cliente_id, fecha, monto, metodo_pago, comprobante, observaciones)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const fecha = data.fecha || new Date().toISOString();
    const info = stmt.run(
      data.cliente_id,
      fecha,
      data.monto || 0,
      data.metodo_pago || 'Efectivo',
      data.comprobante || '',
      data.observaciones || ''
    );

    const pagoId = info.lastInsertRowid;

    // Registrar crédito en cuenta corriente
    addAccountMovement({
      cliente_id: data.cliente_id,
      fecha,
      tipo: 'Pago',
      descripcion: `Pago recibido ${data.comprobante ? '(' + data.comprobante + ')' : ''}`,
      debito: 0,
      credito: data.monto || 0,
      referencia_id: pagoId
    });

    const payload = {
      id: pagoId,
      cliente_id: Number(data.cliente_id),
      fecha,
      monto: Number(data.monto || 0),
      metodo_pago: data.metodo_pago || 'Efectivo',
      comprobante: data.comprobante || '',
      observaciones: data.observaciones || ''
    };

    handleDualWrite(
      supabaseClientService.addPayment(payload),
      'pagos_cliente',
      'INSERT',
      payload
    );

    return { success: true, id: pagoId };
  }

  function deletePayment(id) {
    if (!id) return { success: false, error: 'ID de pago requerido.' };

    db.prepare('DELETE FROM pagos_cliente WHERE id = ?').run(id);

    handleDualWrite(
      supabaseClientService.deletePayment(id),
      'pagos_cliente',
      'DELETE',
      { id: Number(id) }
    );

    return { success: true };
  }

  function upsertPayment(pago) {
    if (!pago || !pago.id) return { success: false, error: 'ID de pago requerido.' };

    const stmt = db.prepare(`
      INSERT INTO pagos_cliente (id, cliente_id, fecha, monto, metodo_pago, comprobante, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        cliente_id = excluded.cliente_id,
        fecha = excluded.fecha,
        monto = excluded.monto,
        metodo_pago = excluded.metodo_pago,
        comprobante = excluded.comprobante,
        observaciones = excluded.observaciones
    `);

    stmt.run(
      Number(pago.id),
      Number(pago.cliente_id),
      pago.fecha || new Date().toISOString(),
      pago.monto !== undefined ? Number(pago.monto) : 0,
      pago.metodo_pago || 'Efectivo',
      pago.comprobante || '',
      pago.observaciones || ''
    );

    return { success: true, id: Number(pago.id) };
  }

  // ── CUENTA CORRIENTE CLIENTE ───────────────────────────────────────────────
  function getAccountMovements(clienteId) {
    return db.prepare('SELECT * FROM cuenta_corriente_cliente WHERE cliente_id = ? ORDER BY fecha DESC, id DESC').all(clienteId);
  }

  function getClientBalance(clienteId) {
    const result = db.prepare(`
      SELECT SUM(debito - credito) as saldo
      FROM cuenta_corriente_cliente
      WHERE cliente_id = ?
    `).get(clienteId);
    return result ? (result.saldo || 0) : 0;
  }

  function addAccountMovement(data) {
    if (!data || !data.cliente_id) return { success: false, error: 'ID de cliente requerido.' };

    const stmt = db.prepare(`
      INSERT INTO cuenta_corriente_cliente (cliente_id, fecha, tipo, descripcion, debito, credito, referencia_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.cliente_id,
      data.fecha || new Date().toISOString(),
      data.tipo || 'Venta',
      data.descripcion || '',
      data.debito || 0,
      data.credito || 0,
      data.referencia_id || null
    );

    const movId = info.lastInsertRowid;

    const payload = {
      id: movId,
      cliente_id: Number(data.cliente_id),
      fecha: data.fecha || new Date().toISOString(),
      tipo: data.tipo || 'Venta',
      descripcion: data.descripcion || '',
      debito: Number(data.debito || 0),
      credito: Number(data.credito || 0),
      referencia_id: data.referencia_id ? Number(data.referencia_id) : null
    };

    handleDualWrite(
      supabaseClientService.addAccountMovement(payload),
      'cuenta_corriente_cliente',
      'INSERT',
      payload
    );

    return { success: true, id: movId };
  }

  function upsertAccountMovement(movimiento) {
    if (!movimiento || !movimiento.id) return { success: false, error: 'ID de movimiento requerido.' };

    const stmt = db.prepare(`
      INSERT INTO cuenta_corriente_cliente (id, cliente_id, fecha, tipo, descripcion, debito, credito, referencia_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        cliente_id = excluded.cliente_id,
        fecha = excluded.fecha,
        tipo = excluded.tipo,
        descripcion = excluded.descripcion,
        debito = excluded.debito,
        credito = excluded.credito,
        referencia_id = excluded.referencia_id
    `);

    stmt.run(
      Number(movimiento.id),
      Number(movimiento.cliente_id),
      movimiento.fecha || new Date().toISOString(),
      movimiento.tipo || 'Venta',
      movimiento.descripcion || '',
      movimiento.debito !== undefined ? Number(movimiento.debito) : 0,
      movimiento.credito !== undefined ? Number(movimiento.credito) : 0,
      movimiento.referencia_id ? Number(movimiento.referencia_id) : null
    );

    return { success: true, id: Number(movimiento.id) };
  }

  // ── VENTAS CLIENTE A CUENTA CORRIENTE ───────────────────────────────
  function getSales() {
    return db.prepare(`
      SELECT v.*, c.nombre as cliente_nombre 
      FROM cliente_ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      ORDER BY v.fecha DESC, v.created_at DESC
    `).all();
  }

  function addSale(sale) {
    const transaction = db.transaction(() => {
      const total = parseFloat(sale.total) || 0;
      const productosArr = Array.isArray(sale.productos) ? sale.productos : [];

      const info = db.prepare(`
        INSERT INTO cliente_ventas (cliente_id, fecha, fecha_estimada_cobro, comprobante, observaciones, total, saldo_pendiente, estado, productos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sale.cliente_id,
        sale.fecha,
        sale.fecha_estimada_cobro || null,
        sale.comprobante || null,
        sale.observaciones || null,
        total,
        total,
        'Pendiente',
        JSON.stringify(productosArr)
      );

      const saleId = info.lastInsertRowid;

      // Descontar stock localmente y disparar Dual Write de stock
      for (const p of productosArr) {
        if (p.id) {
          const currentProd = db.prepare('SELECT uuid, stock, nombre FROM productos WHERE id = ?').get(p.id);
          if (currentProd) {
            const newStock = Math.max(0, currentProd.stock - p.cantidad);
            db.prepare('UPDATE productos SET stock = ? WHERE id = ?').run(newStock, p.id);
            
            if (typeof registrarAccion === 'function') {
              registrarAccion(
                'Venta Cliente Cta Cte', 
                `Descuento de ${p.cantidad} unidades de ${currentProd.nombre} (Venta #${saleId})`
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

      // Obtener nombre de cliente para auditoría
      const clienteObj = getClientById(sale.cliente_id);
      const clienteNombre = clienteObj ? clienteObj.nombre : `ID ${sale.cliente_id}`;

      // Registrar movimiento de débito en cuenta corriente
      addAccountMovement({
        cliente_id: sale.cliente_id,
        fecha: sale.fecha,
        tipo: 'Venta',
        descripcion: `Venta a Cta Cte #${saleId} - ${sale.comprobante || 'Sin comprobante'}`,
        debito: total,
        credito: 0,
        referencia_id: saleId
      });

      if (typeof registrarAccion === 'function') {
        registrarAccion('Venta Cliente Cta Cte', `Venta #${saleId} a ${clienteNombre} por $${total}`);
      }

      const payload = {
        id: saleId,
        cliente_id: Number(sale.cliente_id),
        fecha: sale.fecha,
        fecha_estimada_cobro: sale.fecha_estimada_cobro || null,
        comprobante: sale.comprobante || null,
        observaciones: sale.observaciones || null,
        total,
        saldo_pendiente: total,
        estado: 'Pendiente',
        productos: productosArr
      };

      handleDualWrite(
        supabaseClientService.addSale(payload),
        'cliente_ventas',
        'INSERT',
        payload
      );

      return { success: true, id: saleId };
    });

    return transaction();
  }

  function deleteSale(id) {
    if (!id) return { success: false, error: 'ID de venta requerido.' };

    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM cliente_ventas WHERE id = ?').get(id);
      if (!sale) return { success: false, error: 'Venta no encontrada.' };

      // Restaurar stock
      let prods = [];
      try {
        prods = JSON.parse(sale.productos) || [];
      } catch (e) {}

      for (const p of prods) {
        if (p.id) {
          const currentProd = db.prepare('SELECT uuid, stock, nombre FROM productos WHERE id = ?').get(p.id);
          if (currentProd) {
            const newStock = currentProd.stock + (p.cantidad || 0);
            db.prepare('UPDATE productos SET stock = ? WHERE id = ?').run(newStock, p.id);
            
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

      // Eliminar movimientos de cta cte vinculados a esta venta
      db.prepare("DELETE FROM cuenta_corriente_cliente WHERE tipo = 'Venta' AND referencia_id = ?").run(id);

      // Eliminar la venta
      db.prepare('DELETE FROM cliente_ventas WHERE id = ?').run(id);

      if (typeof registrarAccion === 'function') {
        registrarAccion('Eliminación Venta Cliente', `Venta #${id} eliminada y stock restituido.`);
      }

      handleDualWrite(
        supabaseClientService.deleteSale(id),
        'cliente_ventas',
        'DELETE',
        { id: Number(id) }
      );

      return { success: true };
    });

    return transaction();
  }

  function addSalePayment(pago) {
    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT total, saldo_pendiente, cliente_id FROM cliente_ventas WHERE id = ?').get(pago.venta_id);
      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      const monto = parseFloat(pago.monto) || 0;

      // Registrar en pagos_cliente
      const info = db.prepare(`
        INSERT INTO pagos_cliente (cliente_id, fecha, monto, metodo_pago, comprobante, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        sale.cliente_id,
        pago.fecha,
        monto,
        pago.metodo_pago || 'Efectivo',
        pago.comprobante || `Pago Venta #${pago.venta_id}`,
        pago.observaciones || null
      );

      const pagoId = info.lastInsertRowid;

      const nuevoSaldo = Math.max(0, sale.saldo_pendiente - monto);
      let nuevoEstado = 'Pendiente';
      if (nuevoSaldo === 0) {
        nuevoEstado = 'Cobrado';
      } else if (nuevoSaldo < sale.total) {
        nuevoEstado = 'Pago parcial';
      }

      db.prepare(`
        UPDATE cliente_ventas
        SET saldo_pendiente = ?, estado = ?
        WHERE id = ?
      `).run(nuevoSaldo, nuevoEstado, pago.venta_id);

      // Registrar movimiento de crédito en cta cte
      addAccountMovement({
        cliente_id: sale.cliente_id,
        fecha: pago.fecha,
        tipo: 'Pago',
        descripcion: `Pago Venta #${pago.venta_id} (${pago.metodo_pago || 'Efectivo'})`,
        debito: 0,
        credito: monto,
        referencia_id: pagoId
      });

      if (typeof registrarAccion === 'function') {
        registrarAccion(
          'Cobro Cliente Cta Cte', 
          `Cobro de $${monto} registrado para Venta #${pago.venta_id}. Saldo restante: $${nuevoSaldo}`
        );
      }

      const payloadPago = {
        id: pagoId,
        cliente_id: Number(sale.cliente_id),
        fecha: pago.fecha,
        monto,
        metodo_pago: pago.metodo_pago || 'Efectivo',
        comprobante: pago.comprobante || `Pago Venta #${pago.venta_id}`,
        observaciones: pago.observaciones || null
      };

      handleDualWrite(
        supabaseClientService.addPayment(payloadPago),
        'pagos_cliente',
        'INSERT',
        payloadPago
      );

      // Replicar actualización de la venta en Supabase
      const ventaActualizada = db.prepare('SELECT * FROM cliente_ventas WHERE id = ?').get(pago.venta_id);
      if (ventaActualizada) {
        handleDualWrite(
          supabaseClientService.addSale(ventaActualizada),
          'cliente_ventas',
          'INSERT',
          ventaActualizada
        );
      }

      return { success: true, id: pagoId };
    });

    return transaction();
  }

  function getUpcomingCollections() {
    return db.prepare(`
      SELECT v.*, c.nombre as cliente_nombre 
      FROM cliente_ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      WHERE v.saldo_pendiente > 0 
      ORDER BY v.fecha_estimada_cobro ASC
    `).all();
  }

  function getStats() {
    const totalVendido = db.prepare("SELECT COALESCE(SUM(total), 0) as n FROM cliente_ventas").get().n;
    const totalPendiente = db.prepare("SELECT COALESCE(SUM(saldo_pendiente), 0) as n FROM cliente_ventas").get().n;
    const totalCobrado = totalVendido - totalPendiente;
    
    const cantVentas = db.prepare("SELECT COUNT(*) as n FROM cliente_ventas").get().n;
    const cantPendientes = db.prepare("SELECT COUNT(*) as n FROM cliente_ventas WHERE estado != 'Cobrado'").get().n;
    const cantCobradas = db.prepare("SELECT COUNT(*) as n FROM cliente_ventas WHERE estado = 'Cobrado'").get().n;

    const topDeudores = db.prepare(`
      SELECT c.id, c.nombre, c.telefono, COALESCE(SUM(v.saldo_pendiente), 0) as deuda
      FROM clientes c
      JOIN cliente_ventas v ON c.id = v.cliente_id
      WHERE v.saldo_pendiente > 0
      GROUP BY c.id
      ORDER BY deuda DESC
      LIMIT 5
    `).all();

    return {
      totalVendido,
      totalPendiente,
      totalCobrado,
      cantVentas,
      cantPendientes,
      cantCobradas,
      topDeudores
    };
  }

  function upsertSale(sale) {
    if (!sale || !sale.id) return { success: false, error: 'ID de venta requerido.' };

    const productosJson = typeof sale.productos === 'string' ? sale.productos : JSON.stringify(sale.productos || []);

    const stmt = db.prepare(`
      INSERT INTO cliente_ventas (id, cliente_id, fecha, fecha_estimada_cobro, comprobante, observaciones, total, saldo_pendiente, estado, productos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        cliente_id = excluded.cliente_id,
        fecha = excluded.fecha,
        fecha_estimada_cobro = excluded.fecha_estimada_cobro,
        comprobante = excluded.comprobante,
        observaciones = excluded.observaciones,
        total = excluded.total,
        saldo_pendiente = excluded.saldo_pendiente,
        estado = excluded.estado,
        productos = excluded.productos
    `);

    stmt.run(
      Number(sale.id),
      Number(sale.cliente_id),
      sale.fecha,
      sale.fecha_estimada_cobro || null,
      sale.comprobante || null,
      sale.observaciones || null,
      Number(sale.total || 0),
      Number(sale.saldo_pendiente ?? sale.total ?? 0),
      sale.estado || 'Pendiente',
      productosJson
    );

    return { success: true };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    upsertClient,
    getSales,
    addSale,
    deleteSale,
    upsertSale,
    addSalePayment,
    getPaymentsByClient,
    addPayment,
    deletePayment,
    upsertPayment,
    getUpcomingCollections,
    getStats,
    getAccountMovements,
    getClientBalance,
    addAccountMovement,
    upsertAccountMovement
  };
}

module.exports = createClientService;
