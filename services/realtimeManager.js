// services/realtimeManager.js
//
// Servicio de gestión de Supabase Realtime para Electron.
// Escucha eventos de cambio vía WebSockets en el Main Process (productos, clientes, cliente_ventas,
// municipio_ordenes, atmos_ordenes) usando canales dedicados por entidad y actualiza SQLite local.

'use strict';

const CONFIG = require('./config');
const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

class RealtimeManager {
  constructor() {
    this.channels = {};
    this.mainWindow = null;
    this.isSubscribed = false;
    this.db = null;
    this.debounceTimer = null;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  setDatabase(dbInstance) {
    this.db = dbInstance;
  }

  init() {
    if (CONFIG.APP_MODE !== 'ONLINE') {
      console.log('[RealtimeManager] APP_MODE es LOCAL. Realtime deshabilitado.');
      return;
    }

    if (!isSupabaseConfigured()) {
      console.warn('[RealtimeManager] Supabase no está configurado. Realtime omitido.');
      return;
    }

    this.subscribeChannels();
  }

  subscribeChannels() {
    const client = getSupabaseClient();
    if (!client) return;

    this.destroy();

    console.log('[RealtimeManager] Iniciando suscripciones Supabase Realtime con canales dedicados...');

    const tablesConfig = [
      { name: 'productos', topic: 'realtime:productos', handler: (p) => this.handleProductChange(p), channelKey: 'realtime-product-event' },
      { name: 'cliente_ventas', topic: 'realtime:cliente_ventas', handler: (p) => this.handleClientSaleChange(p), channelKey: 'realtime-client-sale-event' },
      { name: 'clientes', topic: 'realtime:clientes', handler: (p) => this.handleClientChange(p), channelKey: 'realtime-client-event' },
      { name: 'municipio_ordenes', topic: 'realtime:municipio_ordenes', handler: (p) => this.handleMunicipioOrderChange(p), channelKey: 'realtime-muni-order-event' },
      { name: 'atmos_ordenes', topic: 'realtime:atmos_ordenes', handler: (p) => this.handleAtmosOrderChange(p), channelKey: 'realtime-atmos-order-event' },
      { name: 'ventas', topic: 'realtime:ventas', handler: (p) => this.handleVentaChange(p), channelKey: 'realtime-venta-event' },
      { name: 'tickets', topic: 'realtime:tickets', handler: (p) => this.handleTicketChange(p), channelKey: 'realtime-ticket-event' },
      { name: 'gastos', topic: 'realtime:gastos', handler: (p) => this.handleExpenseChange(p), channelKey: 'realtime-expense-event' },
      { name: 'pagos_proveedor', topic: 'realtime:pagos_proveedor', handler: (p) => this.handleGenericFinanceChange(p, 'pagos_proveedor'), channelKey: 'realtime-finance-event' },
      { name: 'compras_proveedor', topic: 'realtime:compras_proveedor', handler: (p) => this.handleGenericFinanceChange(p, 'compras_proveedor'), channelKey: 'realtime-finance-event' },
      { name: 'pagos_cliente', topic: 'realtime:pagos_cliente', handler: (p) => this.handleGenericFinanceChange(p, 'pagos_cliente'), channelKey: 'realtime-finance-event' },
      { name: 'municipio_pagos', topic: 'realtime:municipio_pagos', handler: (p) => this.handleGenericFinanceChange(p, 'municipio_pagos'), channelKey: 'realtime-finance-event' },
      { name: 'atmos_pagos', topic: 'realtime:atmos_pagos', handler: (p) => this.handleGenericFinanceChange(p, 'atmos_pagos'), channelKey: 'realtime-finance-event' },
      { name: 'empleado_liquidaciones', topic: 'realtime:empleado_liquidaciones', handler: (p) => this.handleGenericFinanceChange(p, 'empleado_liquidaciones'), channelKey: 'realtime-finance-event' },
      { name: 'ajustes_caja', topic: 'realtime:ajustes_caja', handler: (p) => this.handleAjustesCajaChange(p), channelKey: 'realtime-finance-event' }
    ];

    tablesConfig.forEach(({ name, topic, handler }) => {
      console.log(`[RealtimeManager] Suscribiendo canal dedicado "${topic}" para la tabla "${name}"...`);
      const channel = client.channel(topic)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: name },
          (payload) => {
            console.log(`[RealtimeManager] TRAMA WEBSOCKET RECIBIDA en "${name}" [${payload.eventType}]:`, payload);
            handler(payload);
          }
        )
        .subscribe((status, err) => {
          console.log(`[RealtimeManager] Estado de suscripción Realtime para "${name}" [${topic}]: ${status}`);
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[RealtimeManager] Alerta de estado en canal "${name}": ${status}`, err || '');
          }
        });

      this.channels[name] = channel;
    });
  }

  async handleProductChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "productos":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const prodId = Number(newRow.id);
          const codigo = newRow.codigo ? String(newRow.codigo).trim() : '';
          const nombre = newRow.nombre ? String(newRow.nombre).trim() : '';

          if (codigo && nombre) {
            const existing = this.db.prepare('SELECT id FROM productos WHERE codigo = ? AND nombre = ?').get(codigo, nombre);
            if (existing && Number(existing.id) !== prodId) {
              console.log(`[RealtimeManager] Re-alineando ID local de producto ${existing.id} ➔ ${prodId} por coincidencia de código/nombre.`);
              this.db.prepare('UPDATE productos SET id = ? WHERE id = ?').run(prodId, Number(existing.id));
            }
          }

          const stmt = this.db.prepare(`
            INSERT INTO productos (id, codigo, nombre, categoria, stock, unidad, precio_costo, precio, stock_minimo, proveedor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              codigo = excluded.codigo,
              nombre = excluded.nombre,
              categoria = excluded.categoria,
              stock = excluded.stock,
              unidad = excluded.unidad,
              precio_costo = excluded.precio_costo,
              precio = excluded.precio,
              stock_minimo = excluded.stock_minimo,
              proveedor_id = excluded.proveedor_id
          `);
          const res = stmt.run(
            prodId,
            codigo,
            nombre,
            String(newRow.categoria || ''),
            Number(newRow.stock || 0),
            String(newRow.unidad || 'un'),
            Number(newRow.precio_costo || 0),
            Number(newRow.precio || 0),
            Number(newRow.stock_minimo || 10),
            newRow.proveedor_id ? Number(newRow.proveedor_id) : null
          );
          console.log('[RealtimeManager] SQLite actualizado en productos:', { id: prodId, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM productos WHERE id = ?').run(deletedId);
            if (res.changes > 0) {
              console.log('[RealtimeManager] Producto eliminado de SQLite por Realtime:', { id: deletedId, changes: res.changes });
            } else {
              console.warn('[RealtimeManager] Producto no encontrado en SQLite durante DELETE Realtime (posible desincronización previa):', { id: deletedId, changes: 0 });
            }
          } else {
            console.warn('[RealtimeManager] DELETE de productos recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de productos:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-product-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleClientSaleChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "cliente_ventas":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const productosJson = typeof newRow.productos === 'string' ? newRow.productos : JSON.stringify(newRow.productos || []);
          const stmt = this.db.prepare(`
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
          const res = stmt.run(
            Number(newRow.id),
            Number(newRow.cliente_id),
            newRow.fecha,
            newRow.fecha_estimada_cobro || null,
            newRow.comprobante || null,
            newRow.observaciones || null,
            Number(newRow.total || 0),
            Number(newRow.saldo_pendiente ?? newRow.total ?? 0),
            newRow.estado || 'Pendiente',
            productosJson
          );
          console.log('[RealtimeManager] SQLite actualizado en cliente_ventas:', { id: newRow.id, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM cliente_ventas WHERE id = ?').run(deletedId);
            console.log('[RealtimeManager] Venta cliente eliminada de SQLite por Realtime:', { id: deletedId, changes: res.changes });
          } else {
            console.warn('[RealtimeManager] DELETE de cliente_ventas recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de cliente_ventas:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-client-sale-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleClientChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "clientes":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const stmt = this.db.prepare(`
            INSERT INTO clientes (id, nombre, telefono, email, direccion, cuit, observaciones, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              nombre = excluded.nombre,
              telefono = excluded.telefono,
              email = excluded.email,
              direccion = excluded.direccion,
              cuit = excluded.cuit,
              observaciones = excluded.observaciones,
              estado = excluded.estado
          `);
          const res = stmt.run(
            Number(newRow.id),
            String(newRow.nombre || ''),
            newRow.telefono || null,
            newRow.email || null,
            newRow.direccion || null,
            newRow.cuit || null,
            newRow.observaciones || null,
            newRow.estado || 'Activo'
          );
          console.log('[RealtimeManager] SQLite actualizado en clientes:', { id: newRow.id, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM clientes WHERE id = ?').run(deletedId);
            console.log('[RealtimeManager] Cliente eliminado de SQLite por Realtime:', { id: deletedId, changes: res.changes });
          } else {
            console.warn('[RealtimeManager] DELETE de clientes recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de clientes:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-client-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleMunicipioOrderChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "municipio_ordenes":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const stmt = this.db.prepare(`
            INSERT INTO municipio_ordenes (id, numero_orden, fecha, concepto, total, saldo_pendiente, estado, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              numero_orden = excluded.numero_orden,
              fecha = excluded.fecha,
              concepto = excluded.concepto,
              total = excluded.total,
              saldo_pendiente = excluded.saldo_pendiente,
              estado = excluded.estado,
              observaciones = excluded.observaciones
          `);
          const res = stmt.run(
            Number(newRow.id),
            String(newRow.numero_orden || ''),
            newRow.fecha,
            newRow.concepto || null,
            Number(newRow.total || 0),
            Number(newRow.saldo_pendiente ?? newRow.total ?? 0),
            newRow.estado || 'Pendiente',
            newRow.observaciones || null
          );
          console.log('[RealtimeManager] SQLite actualizado en municipio_ordenes:', { id: newRow.id, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM municipio_ordenes WHERE id = ?').run(deletedId);
            console.log('[RealtimeManager] Orden Municipio eliminada de SQLite por Realtime:', { id: deletedId, changes: res.changes });
          } else {
            console.warn('[RealtimeManager] DELETE de municipio_ordenes recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de municipio_ordenes:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-muni-order-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleAtmosOrderChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "atmos_ordenes":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const stmt = this.db.prepare(`
            INSERT INTO atmos_ordenes (id, fecha, cliente, direccion, telefono, tipo_servicio, descripcion, monto, saldo_pendiente, estado, observaciones, fecha_estimada_cobro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              fecha = excluded.fecha,
              cliente = excluded.cliente,
              direccion = excluded.direccion,
              telefono = excluded.telefono,
              tipo_servicio = excluded.tipo_servicio,
              descripcion = excluded.descripcion,
              monto = excluded.monto,
              saldo_pendiente = excluded.saldo_pendiente,
              estado = excluded.estado,
              observaciones = excluded.observaciones,
              fecha_estimada_cobro = excluded.fecha_estimada_cobro
          `);
          const res = stmt.run(
            Number(newRow.id),
            newRow.fecha,
            String(newRow.cliente || ''),
            String(newRow.direccion || ''),
            newRow.telefono || null,
            String(newRow.tipo_servicio || 'Desagote'),
            newRow.descripcion || null,
            Number(newRow.monto || 0),
            Number(newRow.saldo_pendiente ?? newRow.monto ?? 0),
            newRow.estado || 'Pendiente',
            newRow.observaciones || null,
            newRow.fecha_estimada_cobro || null
          );
          console.log('[RealtimeManager] SQLite actualizado en atmos_ordenes:', { id: newRow.id, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM atmos_ordenes WHERE id = ?').run(deletedId);
            console.log('[RealtimeManager] Orden Atmosférico eliminada de SQLite por Realtime:', { id: deletedId, changes: res.changes });
          } else {
            console.warn('[RealtimeManager] DELETE de atmos_ordenes recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de atmos_ordenes:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-atmos-order-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleVentaChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "ventas":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const stmt = this.db.prepare(`
            INSERT INTO ventas (id, producto_id, cantidad, total, cliente, metodo_pago, fecha)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              producto_id = excluded.producto_id,
              cantidad = excluded.cantidad,
              total = excluded.total,
              cliente = excluded.cliente,
              metodo_pago = excluded.metodo_pago,
              fecha = excluded.fecha
          `);
          const res = stmt.run(
            Number(newRow.id),
            newRow.producto_id ? Number(newRow.producto_id) : null,
            Number(newRow.cantidad || 1),
            Number(newRow.total || 0),
            newRow.cliente ? String(newRow.cliente).trim() : 'Consumidor Final',
            newRow.metodo_pago ? String(newRow.metodo_pago).trim() : 'Efectivo',
            newRow.fecha
          );
          console.log('[RealtimeManager] SQLite actualizado en ventas:', { id: newRow.id, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM ventas WHERE id = ?').run(deletedId);
            console.log('[RealtimeManager] Venta eliminada de SQLite por Realtime:', { id: deletedId, changes: res.changes });
          } else {
            console.warn('[RealtimeManager] DELETE de ventas recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de ventas:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-venta-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleTicketChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    console.log('[RealtimeManager] Procesando evento "tickets":', { eventType, newRow, oldRow });

    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null)
      ? Number(oldRow.id)
      : (payload && payload.old && payload.old.id !== undefined && payload.old.id !== null)
        ? Number(payload.old.id)
        : null;

    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const productosJson = typeof newRow.productos === 'string'
            ? newRow.productos
            : JSON.stringify(newRow.productos || []);

          const stmt = this.db.prepare(`
            INSERT INTO tickets (id, fecha, metodo_pago, total, productos, tipo, descuento, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              fecha = excluded.fecha,
              metodo_pago = excluded.metodo_pago,
              total = excluded.total,
              productos = excluded.productos,
              tipo = excluded.tipo,
              descuento = excluded.descuento,
              subtotal = excluded.subtotal
          `);
          const res = stmt.run(
            Number(newRow.id),
            newRow.fecha,
            newRow.metodo_pago ? String(newRow.metodo_pago).trim() : 'Efectivo',
            Number(newRow.total || 0),
            productosJson,
            newRow.tipo || 'Venta',
            Number(newRow.descuento || 0),
            Number(newRow.subtotal || newRow.total || 0)
          );
          console.log('[RealtimeManager] SQLite actualizado en tickets:', { id: newRow.id, changes: res.changes });
        } else if (eventType === 'DELETE') {
          if (deletedId) {
            const res = this.db.prepare('DELETE FROM tickets WHERE id = ?').run(deletedId);
            console.log('[RealtimeManager] Ticket eliminado de SQLite por Realtime:', { id: deletedId, changes: res.changes });
          } else {
            console.warn('[RealtimeManager] DELETE de tickets recibido pero sin ID en payload.old:', payload);
          }
        }
      } catch (dbErr) {
        console.warn('[RealtimeManager] Error actualizando caché SQLite de tickets:', dbErr.message);
      }
    }

    this.notifyRenderer('realtime-ticket-event', { eventType, newRow, oldRow, deletedId });
  }

  async handleExpenseChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null) ? Number(oldRow.id) : null;
    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const stmt = this.db.prepare(`
            INSERT INTO gastos (id, fecha, concepto, categoria, monto, observacion, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              fecha = excluded.fecha,
              concepto = excluded.concepto,
              categoria = excluded.categoria,
              monto = excluded.monto,
              observacion = excluded.observacion,
              estado = excluded.estado
          `);
          stmt.run(
            Number(newRow.id),
            newRow.fecha,
            newRow.concepto,
            newRow.categoria,
            Number(newRow.monto || 0),
            newRow.observacion,
            newRow.estado || 'Pagado'
          );
        } else if (eventType === 'DELETE' && deletedId) {
          this.db.prepare('DELETE FROM gastos WHERE id = ?').run(deletedId);
        }
      } catch (err) {
        console.warn('[RealtimeManager] Error actualizando gastos en SQLite:', err.message);
      }
    }
    this.notifyRenderer('realtime-finance-event', { eventType, newRow, oldRow, deletedId, table: 'gastos' });
  }

  async handleAjustesCajaChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null) ? Number(oldRow.id) : null;
    if (this.db) {
      try {
        if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
          const stmt = this.db.prepare(`
            INSERT INTO ajustes_caja (id, fecha, tipo, motivo, monto, observacion, venta_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              fecha = excluded.fecha,
              tipo = excluded.tipo,
              motivo = excluded.motivo,
              monto = excluded.monto,
              observacion = excluded.observacion,
              venta_id = excluded.venta_id
          `);
          stmt.run(
            Number(newRow.id),
            newRow.fecha,
            newRow.tipo,
            newRow.motivo,
            Number(newRow.monto || 0),
            newRow.observacion,
            newRow.venta_id || null
          );
        } else if (eventType === 'DELETE' && deletedId) {
          this.db.prepare('DELETE FROM ajustes_caja WHERE id = ?').run(deletedId);
        }
      } catch (err) {
        console.warn('[RealtimeManager] Error actualizando ajustes_caja en SQLite:', err.message);
      }
    }
    this.notifyRenderer('realtime-finance-event', { eventType, newRow, oldRow, deletedId, table: 'ajustes_caja' });
  }

  async handleGenericFinanceChange(payload, tableName) {
    const { eventType, new: newRow, old: oldRow } = payload;
    const deletedId = (oldRow && oldRow.id !== undefined && oldRow.id !== null) ? Number(oldRow.id) : null;
    this.notifyRenderer('realtime-finance-event', { eventType, newRow, oldRow, deletedId, table: tableName });
  }

  notifyRenderer(channelName, data) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        console.log(`[RealtimeManager] Notificando al Renderer por IPC (${channelName})...`);
        this.mainWindow.webContents.send(channelName, data);
      }
    }, 100);
  }

  destroy() {
    const client = getSupabaseClient();
    Object.keys(this.channels).forEach(tableName => {
      const channel = this.channels[tableName];
      if (channel && client) {
        client.removeChannel(channel);
      }
    });
    this.channels = {};
    this.isSubscribed = false;
  }
}

const realtimeManagerInstance = new RealtimeManager();
module.exports = realtimeManagerInstance;
