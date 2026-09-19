// services/supabaseTicketService.js
//
// Fase 6 (Sub-paso Módulo Tickets) — Servicio de Lectura/Escritura de Tickets en Supabase.
// Encapsula las operaciones de acceso a la tabla 'tickets' en PostgreSQL (Supabase).

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseTicketService = {
  /**
   * Obtiene todos los tickets desde la tabla 'tickets' en Supabase.
   * 
   * @returns {Promise<Array<object>>} Arreglo de tickets o [] si hay error/falta de configuración.
   */
  async getAllTickets() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseTicketService] Supabase no está configurado en .env / config.js. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseTicketService] Instancia del cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('tickets')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseTicketService] Error al obtener tickets desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseTicketService] Excepción al consultar la tabla tickets:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza (upsert) un ticket en la tabla 'tickets' en Supabase.
   * 
   * @param {object} ticket - Objeto de ticket con { id, fecha, metodo_pago, total, productos, tipo, descuento, subtotal }.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addTicket(ticket) {
    if (!ticket) {
      return { success: false, error: 'Datos de ticket inválidos.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseTicketService] Supabase no configurado. Omitiendo creación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let productosPayload = ticket.productos;
      if (typeof productosPayload === 'string') {
        try {
          productosPayload = JSON.parse(productosPayload);
        } catch (e) {
          productosPayload = [];
        }
      }

      const payload = {
        metodo_pago: ticket.metodo_pago || '-',
        total: ticket.total !== undefined ? Number(ticket.total) : 0,
        productos: Array.isArray(productosPayload) ? productosPayload : [],
        tipo: ticket.tipo || 'Venta',
        descuento: ticket.descuento !== undefined ? Number(ticket.descuento) : 0,
        subtotal: ticket.subtotal !== undefined ? Number(ticket.subtotal) : 0,
        fecha: ticket.fecha || new Date().toISOString()
      };

      if (ticket.id) payload.id = Number(ticket.id);
      if (ticket.client_transaction_id) payload.client_transaction_id = ticket.client_transaction_id;

      const { error } = await client
        .from('tickets')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseTicketService] Error al insertar ticket en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseTicketService] Ticket guardado en Supabase ID:', payload.id || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseTicketService] Excepción al guardar ticket en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un ticket por su ID en Supabase.
   * 
   * @param {number|string} id - ID del ticket a eliminar.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteTicket(id) {
    if (!id) return { success: false, error: 'ID de ticket requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseTicketService] Supabase no configurado. Omitiendo eliminación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('tickets')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseTicketService] Error al eliminar ticket ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseTicketService] Ticket eliminado en Supabase (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseTicketService] Excepción al eliminar ticket ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseTicketService;
