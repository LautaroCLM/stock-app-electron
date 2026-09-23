// services/supabaseMunicipioService.js
//
// Servicio de Lectura/Escritura de Ordenes y Pagos de Municipio en Supabase.
// Encapsula las operaciones contra las tablas 'municipio_ordenes' y 'municipio_pagos'.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseMunicipioService = {
  // ── ORDENES MUNICIPIO ───────────────────────────────────────────────────────
  /**
   * Obtiene todas las órdenes del municipio desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllOrders() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseMunicipioService] Supabase no está configurado. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('municipio_ordenes')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseMunicipioService] Error al obtener órdenes de municipio:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseMunicipioService] Excepción al consultar municipio_ordenes:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza una orden de municipio en Supabase.
   * @param {object} order
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addOrder(order) {
    if (!order) return { success: false, error: 'Datos de orden requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let productosPayload = order.productos;
      if (typeof productosPayload === 'string') {
        try {
          productosPayload = JSON.parse(productosPayload);
        } catch (e) {
          productosPayload = [];
        }
      }

      const payload = {
        uuid: order.uuid || null,
        fecha: order.fecha || new Date().toISOString().split('T')[0],
        expediente: order.expediente || null,
        orden_compra: order.orden_compra || null,
        fecha_estimada_cobro: order.fecha_estimada_cobro || null,
        observaciones: order.observaciones || null,
        total: order.total !== undefined ? Number(order.total) : 0,
        saldo_pendiente: order.saldo_pendiente !== undefined ? Number(order.saldo_pendiente) : Number(order.total || 0),
        estado: order.estado || 'Pendiente',
        productos: Array.isArray(productosPayload) ? productosPayload : []
      };

      if (order.id) payload.id = Number(order.id);

      const onConflictColumn = order.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('municipio_ordenes')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseMunicipioService] Error al insertar/actualizar orden:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseMunicipioService] Orden municipio guardada en Supabase ID/UUID:', payload.id || payload.uuid || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseMunicipioService] Excepción al guardar orden municipio:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una orden de municipio por su ID/UUID en Supabase.
   * @param {number|string} id
   * @param {string} [uuid]
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteOrder(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de orden requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('municipio_ordenes').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseMunicipioService] Error al eliminar orden ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseMunicipioService] Orden ID/UUID ${uuid || id} eliminada en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseMunicipioService] Excepción al eliminar orden ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── PAGOS MUNICIPIO ────────────────────────────────────────────────────────
  /**
   * Obtiene todos los pagos de municipio desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllPayments() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('municipio_pagos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseMunicipioService] Error al obtener pagos de municipio:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseMunicipioService] Excepción al consultar municipio_pagos:', err.message);
      return [];
    }
  },

  /**
   * Inserta un pago de municipio en Supabase.
   * @param {object} pago
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addPayment(pago) {
    if (!pago) return { success: false, error: 'Datos de pago requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: pago.uuid || null,
        orden_id: pago.orden_id ? Number(pago.orden_id) : null,
        orden_uuid: pago.orden_uuid || null,
        fecha: pago.fecha || new Date().toISOString().split('T')[0],
        monto: pago.monto !== undefined ? Number(pago.monto) : 0,
        metodo_pago: pago.metodo_pago || 'Transferencia',
        observaciones: pago.observaciones || null
      };

      if (pago.id) payload.id = Number(pago.id);

      const onConflictColumn = pago.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('municipio_pagos')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseMunicipioService] Error al guardar pago municipio:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseMunicipioService] Pago municipio guardado en Supabase ID/UUID:', payload.id || payload.uuid || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseMunicipioService] Excepción al guardar pago municipio:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un pago de municipio por ID/UUID en Supabase.
   * @param {number|string} id
   * @param {string} [uuid]
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deletePayment(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de pago requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('municipio_pagos').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseMunicipioService] Error al eliminar pago municipio ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseMunicipioService] Excepción al eliminar pago municipio ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseMunicipioService;
