// services/supabaseAtmosfericoService.js
//
// Servicio de integración con Supabase Cloud para el módulo de Servicios Atmosféricos.
// Maneja la sincronización remota de órdenes y pagos del servicio atmosférico.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseAtmosfericoService = {
  /**
   * Obtiene todas las órdenes atmosféricas desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllOrders() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('atmos_ordenes')
        .select('*')
        .order('fecha', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        console.error('[SupabaseAtmosfericoService] Error al obtener órdenes:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseAtmosfericoService] Excepción al obtener órdenes:', err.message);
      return [];
    }
  },

  /**
   * Crea o actualiza una orden atmosférica en Supabase.
   * @param {object} orderData
   * @returns {Promise<object>}
   */
  async addOrder(orderData) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no inicializado.' };

    try {
      const montoNum = Number(orderData.monto || 0);
      const payload = {
        uuid: orderData.uuid || null,
        fecha: orderData.fecha || new Date().toISOString().split('T')[0],
        cliente: String(orderData.cliente || '').trim(),
        direccion: String(orderData.direccion || '').trim(),
        telefono: orderData.telefono ? String(orderData.telefono).trim() : null,
        tipo_servicio: orderData.tipo_servicio ? String(orderData.tipo_servicio).trim() : 'Desagote',
        descripcion: orderData.descripcion ? String(orderData.descripcion).trim() : '',
        monto: montoNum,
        saldo_pendiente: orderData.saldo_pendiente !== undefined ? Number(orderData.saldo_pendiente) : montoNum,
        estado: orderData.estado || 'Pendiente',
        observaciones: orderData.observaciones ? String(orderData.observaciones).trim() : null,
        fecha_estimada_cobro: orderData.fecha_estimada_cobro || null,
      };

      if (orderData.id) {
        payload.id = Number(orderData.id);
      }

      const onConflictColumn = orderData.uuid ? 'uuid' : 'id';
      const { data, error } = await client
        .from('atmos_ordenes')
        .upsert(payload, { onConflict: onConflictColumn })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseAtmosfericoService] Error al guardar orden:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('[SupabaseAtmosfericoService] Excepción al guardar orden:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una orden atmosférica y sus pagos asociados en Supabase.
   * @param {number|string} id
   * @param {string} [uuid]
   * @returns {Promise<object>}
   */
  async deleteOrder(id, uuid = null) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible.' };

    try {
      if (uuid) {
        await client.from('atmos_pagos').delete().eq('orden_uuid', uuid);
      } else if (id) {
        await client.from('atmos_pagos').delete().eq('orden_id', Number(id));
      }

      let query = client.from('atmos_ordenes').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseAtmosfericoService] Error al eliminar orden ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseAtmosfericoService] Excepción al eliminar orden ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Obtiene todos los pagos de órdenes atmosféricas desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllPayments() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('atmos_pagos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        console.error('[SupabaseAtmosfericoService] Error al obtener pagos:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseAtmosfericoService] Excepción al obtener pagos:', err.message);
      return [];
    }
  },

  /**
   * Registra un nuevo pago de servicio atmosférico en Supabase y recalcula saldo.
   * @param {object} pagoData
   * @returns {Promise<object>}
   */
  async addPayment(pagoData) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible.' };

    try {
      const payload = {
        uuid: pagoData.uuid || null,
        orden_id: pagoData.orden_id ? Number(pagoData.orden_id) : null,
        orden_uuid: pagoData.orden_uuid || null,
        fecha: pagoData.fecha || new Date().toISOString().split('T')[0],
        monto: Number(pagoData.monto),
        metodo_pago: pagoData.metodo_pago || 'Efectivo',
        observaciones: pagoData.observaciones ? String(pagoData.observaciones).trim() : null,
      };

      if (pagoData.id) {
        payload.id = Number(pagoData.id);
      }

      const onConflictColumn = pagoData.uuid ? 'uuid' : 'id';
      const { data, error } = await client
        .from('atmos_pagos')
        .upsert(payload, { onConflict: onConflictColumn })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseAtmosfericoService] Error al registrar pago:', error.message);
        return { success: false, error: error.message };
      }

      await this.recalculateServiceBalance(pagoData.orden_id || pagoData.orden_uuid);

      return { success: true, data };
    } catch (err) {
      console.error('[SupabaseAtmosfericoService] Excepción al registrar pago:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un pago de servicio atmosférico y recalcula el saldo pendiente.
   * @param {number|string} pagoId
   * @param {number|string} ordenId
   * @param {string} [uuid]
   * @returns {Promise<object>}
   */
  async deletePayment(pagoId, ordenId, uuid = null) {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible.' };

    try {
      let query = client.from('atmos_pagos').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(pagoId));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseAtmosfericoService] Error al eliminar pago ID/UUID ${uuid || pagoId}:`, error.message);
        return { success: false, error: error.message };
      }

      if (ordenId) {
        await this.recalculateServiceBalance(ordenId);
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseAtmosfericoService] Excepción al eliminar pago ID/UUID ${uuid || pagoId}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Recalcula el saldo pendiente y el estado de la orden en Supabase.
   * @param {number|string} ordenIdOrUuid
   */
  async recalculateServiceBalance(ordenIdOrUuid) {
    if (!isSupabaseConfigured() || !ordenIdOrUuid) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      let queryOrden = client.from('atmos_ordenes').select('id, uuid, monto');
      if (typeof ordenIdOrUuid === 'string' && ordenIdOrUuid.length > 20) {
        queryOrden = queryOrden.eq('uuid', ordenIdOrUuid);
      } else {
        queryOrden = queryOrden.eq('id', Number(ordenIdOrUuid));
      }

      const { data: orden } = await queryOrden.single();
      if (!orden) return;

      let queryPagos = client.from('atmos_pagos').select('monto');
      if (orden.uuid) {
        queryPagos = queryPagos.eq('orden_uuid', orden.uuid);
      } else {
        queryPagos = queryPagos.eq('orden_id', Number(orden.id));
      }

      const { data: pagos } = await queryPagos;

      const totalPagado = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const montoOrden = Number(orden.monto || 0);
      const nuevoSaldo = Math.max(0, montoOrden - totalPagado);

      let nuevoEstado = 'Pendiente';
      if (nuevoSaldo === 0 && montoOrden > 0) {
        nuevoEstado = 'Cobrado';
      } else if (totalPagado > 0) {
        nuevoEstado = 'Pago parcial';
      }

      let updateQuery = client.from('atmos_ordenes').update({
        saldo_pendiente: nuevoSaldo,
        estado: nuevoEstado,
      });

      if (orden.uuid) {
        await updateQuery.eq('uuid', orden.uuid);
      } else {
        await updateQuery.eq('id', Number(orden.id));
      }
    } catch (err) {
      console.error(`[SupabaseAtmosfericoService] Error recalculando saldo orden ${ordenIdOrUuid}:`, err.message);
    }
  },
};

module.exports = supabaseAtmosfericoService;
