// services/ticketService.js
//
// Fase 0.1 / Fase 6 — Servicio para el módulo de Tickets.
// Encapsula las operaciones de tickets locales en SQLite e integra Dual Write a Supabase.

'use strict';

const supabaseTicketService = require('./supabaseTicketService');

/**
 * Fábrica del servicio de Tickets.
 * @param {import('better-sqlite3').Database} db - Instancia de la base de datos local SQLite.
 * @param {object} [syncManager=null] - Instancia de SyncManager para encolado offline.
 * @returns {object} Objeto con los métodos del servicio.
 */
function createTicketService(db, syncManager = null) {
  if (!db) {
    throw new Error('[TicketService] Instancia de base de datos requerida.');
  }

  // Asegurar migración de columna client_transaction_id en SQLite local
  try {
    const existingCols = new Set(db.prepare("PRAGMA table_info(tickets)").all().map(c => c.name));
    if (!existingCols.has('client_transaction_id')) {
      db.prepare("ALTER TABLE tickets ADD COLUMN client_transaction_id TEXT").run();
      console.log('[TicketService] Columna client_transaction_id agregada a tickets en SQLite.');
    }
  } catch (migErr) {
    console.warn('[TicketService] Error verificando esquema de tickets:', migErr.message);
  }

  function handleDualWrite(promise, entity, action, payload) {
    promise
      .then(res => {
        if (!res || !res.success) {
          console.warn(`[TicketService] Dual Write hacia Supabase no exitoso (${action}). Registrando en offline_queue.`);
          if (syncManager) {
            syncManager.queueOperation({ entity, action, payload });
          }
        }
      })
      .catch(err => {
        console.error(`[TicketService] Error en Dual Write hacia Supabase (${action}):`, err.message || err);
        if (syncManager) {
          syncManager.queueOperation({ entity, action, payload });
        }
      });
  }

  // ── getTickets ────────────────────────────────────────────────────────────
  /**
   * Devuelve todos los tickets registradas en SQLite local.
   * @returns {Array} Lista de tickets.
   */
  function getTickets() {
    const rows = db.prepare(`
      SELECT t.id, t.fecha, t.metodo_pago, t.total, t.productos, t.tipo, t.descuento, t.subtotal, t.cliente, t.client_transaction_id, t.uuid, t.cliente_uuid,
             (SELECT COUNT(*) FROM ajustes_caja a WHERE a.venta_id = t.id AND a.tipo = 'Venta anulada') > 0 AS anulado
      FROM tickets t
      ORDER BY datetime(t.fecha) DESC
    `).all();

    let productosMap = null;
    try {
      const prods = db.prepare('SELECT id, nombre, precio FROM productos').all();
      productosMap = new Map(prods.map(p => [Number(p.id), p]));
    } catch (e) {
      console.warn('[TicketService] Error al obtener catálogo de productos para enriquecimiento:', e.message);
    }

    return rows.map(t => {
      let rawProds = [];
      try {
        rawProds = typeof t.productos === 'string' ? JSON.parse(t.productos || '[]') : (t.productos || []);
      } catch (e) {
        rawProds = [];
      }

      const enrichedProductos = Array.isArray(rawProds) ? rawProds.map(item => {
        if (!item || typeof item !== 'object') return item;

        const prodId = item.producto_id !== undefined ? Number(item.producto_id) : (item.id !== undefined ? Number(item.id) : null);
        const prodDb = prodId && productosMap ? productosMap.get(prodId) : null;

        // 1. Nombre: conservar item.nombre si existe; de lo contrario buscar en productosMap; fallback: "Producto #ID"
        const nombreResuelto = item.nombre || (prodDb ? prodDb.nombre : (prodId ? `Producto #${prodId}` : 'Producto Desconocido'));

        // 2. Precio: conservar item.precio si existe; calcular de total/cantidad; fallback a catálogo o 0
        let precioResuelto = 0;
        if (item.precio !== undefined && item.precio !== null && !isNaN(Number(item.precio))) {
          precioResuelto = Number(item.precio);
        } else if (item.total !== undefined && item.cantidad !== undefined && Number(item.cantidad) > 0) {
          precioResuelto = Number(item.total) / Number(item.cantidad);
        } else if (prodDb && prodDb.precio !== undefined) {
          precioResuelto = Number(prodDb.precio);
        }

        const cantidadResuelta = item.cantidad !== undefined ? Number(item.cantidad) : 1;
        const totalResuelto = item.total !== undefined ? Number(item.total) : (precioResuelto * cantidadResuelta);

        return {
          ...item,
          id: prodId || item.id,
          producto_id: prodId || item.producto_id,
          nombre: nombreResuelto,
          precio: precioResuelto,
          cantidad: cantidadResuelta,
          total: totalResuelto
        };
      }) : [];

      return {
        ...t,
        productos: enrichedProductos,
        descuento: t.descuento || 0,
        subtotal: t.subtotal || 0
      };
    });
  }

  // ── saveTicket ────────────────────────────────────────────────────────────
  /**
   * Guarda un nuevo ticket en SQLite local y dispara Dual Write a Supabase.
   * @param {object} data - Datos del ticket.
   * @returns {{ success: boolean, id?: number, error?: string }}
   */
  function saveTicket(data) {
    const fecha = data.fecha || new Date().toISOString();
    const metodoPago = data.metodo_pago || '-';
    const total = data.total || 0;
    const productos = data.productos || [];
    const tipo = data.tipo || 'Venta';
    const descuento = data.descuento || 0;
    const subtotal = data.subtotal || 0;
    const clientTransactionId = data.client_transaction_id || null;
    const ticketUuid = data.uuid || clientTransactionId || null;
    const clienteUuid = data.cliente_uuid || null;

    const info = db.prepare(`
      INSERT INTO tickets (fecha, metodo_pago, total, productos, tipo, descuento, subtotal, client_transaction_id, uuid, cliente_uuid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fecha,
      metodoPago,
      total,
      JSON.stringify(productos),
      tipo,
      descuento,
      subtotal,
      clientTransactionId,
      ticketUuid,
      clienteUuid
    );

    const ticketId = info.lastInsertRowid;

    const payload = {
      id: ticketId,
      uuid: ticketUuid,
      cliente_uuid: clienteUuid,
      fecha,
      metodo_pago: metodoPago,
      total,
      productos,
      tipo,
      descuento,
      subtotal,
      client_transaction_id: clientTransactionId
    };

    // Dual Write asíncrono hacia Supabase (no bloqueante)
    handleDualWrite(
      supabaseTicketService.addTicket(payload),
      'tickets',
      'INSERT',
      payload
    );

    return { success: true, id: ticketId };
  }

  // ── limpiarTicketsViejos ──────────────────────────────────────────────────
  /**
   * Limpia los tickets con más de 30 días de antigüedad en SQLite local.
   */
  function limpiarTicketsViejos() {
    const res = db.prepare(`
      DELETE FROM tickets
      WHERE julianday('now', 'localtime') - julianday(fecha) > 30
    `).run();
    if (res.changes > 0) {
      console.log(`[TicketService] 🧹 ${res.changes} tickets antiguos eliminados.`);
    }
  }

  // ── upsertTicket (LOCAL SQLITE PURA SIN DUAL WRITE NI ENCOLADO) ───────────
  /**
   * Inserta o actualiza (UPSERT) un ticket en SQLite local basándose en su ID.
   * Utilizado para sincronización entrante desde Supabase hacia la base de datos local.
   * 
   * @param {object} ticket - Objeto con datos del ticket (debe contener id).
   * @returns {{ success: boolean, id?: number, error?: string }}
   */
  function upsertTicket(ticket) {
    if (!ticket || !ticket.id) {
      return { success: false, error: 'ID de ticket requerido para UPSERT.' };
    }

    let productosStr = '[]';
    if (typeof ticket.productos === 'string') {
      productosStr = ticket.productos;
    } else if (Array.isArray(ticket.productos) || typeof ticket.productos === 'object') {
      productosStr = JSON.stringify(ticket.productos || []);
    }

    const clientTxId = ticket.client_transaction_id || null;
    const ticketUuid = ticket.uuid || clientTxId || null;
    const clienteUuid = ticket.cliente_uuid || null;

    if (clientTxId) {
      try {
        const existingLocal = db.prepare(`
          SELECT id FROM tickets WHERE client_transaction_id = ?
        `).get(clientTxId);

        if (existingLocal && Number(existingLocal.id) !== Number(ticket.id)) {
          const localId = Number(existingLocal.id);
          const remoteId = Number(ticket.id);

          db.transaction(() => {
            // 1. Re-vincular cualquier referencia en ajustes_caja si existía con el ID local
            try {
              db.prepare('UPDATE ajustes_caja SET venta_id = ? WHERE venta_id = ?').run(remoteId, localId);
            } catch (e) {}

            // 2. Eliminar la fila del ticket local temporal
            db.prepare('DELETE FROM tickets WHERE id = ?').run(localId);

            // 3. Insertar/Actualizar la fila definitiva con ID remoto
            const stmt = db.prepare(`
              INSERT INTO tickets (id, fecha, metodo_pago, total, productos, tipo, descuento, subtotal, cliente, client_transaction_id, uuid, cliente_uuid)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                fecha = excluded.fecha,
                metodo_pago = excluded.metodo_pago,
                total = excluded.total,
                productos = excluded.productos,
                tipo = excluded.tipo,
                descuento = excluded.descuento,
                subtotal = excluded.subtotal,
                cliente = excluded.cliente,
                client_transaction_id = excluded.client_transaction_id,
                uuid = COALESCE(excluded.uuid, tickets.uuid),
                cliente_uuid = COALESCE(excluded.cliente_uuid, tickets.cliente_uuid)
            `);

            stmt.run(
              remoteId,
              ticket.fecha || new Date().toISOString(),
              ticket.metodo_pago || '-',
              ticket.total !== undefined ? Number(ticket.total) : 0,
              productosStr,
              ticket.tipo || 'Venta',
              ticket.descuento !== undefined ? Number(ticket.descuento) : 0,
              ticket.subtotal !== undefined ? Number(ticket.subtotal) : 0,
              ticket.cliente !== undefined ? ticket.cliente : null,
              clientTxId,
              ticketUuid,
              clienteUuid
            );
          })();

          console.log(`[TicketService] 🔄 Reconciliación de ticket offline completada: Local #${localId} ➔ Remoto #${remoteId} (UUID: ${clientTxId})`);
          return { success: true, id: remoteId, reconciledFrom: localId };
        }
      } catch (recErr) {
        console.warn('[TicketService] Error en verificación de reconciliación de ticket:', recErr.message);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO tickets (id, fecha, metodo_pago, total, productos, tipo, descuento, subtotal, cliente, client_transaction_id, uuid, cliente_uuid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        fecha = excluded.fecha,
        metodo_pago = excluded.metodo_pago,
        total = excluded.total,
        productos = excluded.productos,
        tipo = excluded.tipo,
        descuento = excluded.descuento,
        subtotal = excluded.subtotal,
        cliente = excluded.cliente,
        client_transaction_id = excluded.client_transaction_id,
        uuid = COALESCE(excluded.uuid, tickets.uuid),
        cliente_uuid = COALESCE(excluded.cliente_uuid, tickets.cliente_uuid)
    `);

    stmt.run(
      Number(ticket.id),
      ticket.fecha || new Date().toISOString(),
      ticket.metodo_pago || '-',
      ticket.total !== undefined ? Number(ticket.total) : 0,
      productosStr,
      ticket.tipo || 'Venta',
      ticket.descuento !== undefined ? Number(ticket.descuento) : 0,
      ticket.subtotal !== undefined ? Number(ticket.subtotal) : 0,
      ticket.cliente !== undefined ? ticket.cliente : null,
      clientTxId,
      ticketUuid,
      clienteUuid
    );

    return { success: true, id: Number(ticket.id) };
  }

  // ── API pública del servicio ───────────────────────────────────────────────
  return {
    getTickets,
    saveTicket,
    limpiarTicketsViejos,
    upsertTicket
  };
}

module.exports = createTicketService;
