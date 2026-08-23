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
      SELECT t.id, t.fecha, t.metodo_pago, t.total, t.productos, t.tipo, t.descuento, t.subtotal, t.cliente,
             (SELECT COUNT(*) FROM ajustes_caja a WHERE a.venta_id = t.id AND a.tipo = 'Venta anulada') > 0 AS anulado
      FROM tickets t
      ORDER BY datetime(t.fecha) DESC
    `).all();

    return rows.map(t => ({
      ...t,
      productos: JSON.parse(t.productos || '[]'),
      descuento: t.descuento || 0,
      subtotal: t.subtotal || 0
    }));
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

    const info = db.prepare(`
      INSERT INTO tickets (fecha, metodo_pago, total, productos, tipo, descuento, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      fecha,
      metodoPago,
      total,
      JSON.stringify(productos),
      tipo,
      descuento,
      subtotal
    );

    const ticketId = info.lastInsertRowid;

    const payload = {
      id: ticketId,
      fecha,
      metodo_pago: metodoPago,
      total,
      productos,
      tipo,
      descuento,
      subtotal
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

    const stmt = db.prepare(`
      INSERT INTO tickets (id, fecha, metodo_pago, total, productos, tipo, descuento, subtotal, cliente)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        fecha = excluded.fecha,
        metodo_pago = excluded.metodo_pago,
        total = excluded.total,
        productos = excluded.productos,
        tipo = excluded.tipo,
        descuento = excluded.descuento,
        subtotal = excluded.subtotal,
        cliente = excluded.cliente
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
      ticket.cliente !== undefined ? ticket.cliente : null
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
