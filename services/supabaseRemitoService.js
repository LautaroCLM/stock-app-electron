// services/supabaseRemitoService.js
//
// Servicio de Lectura/Escritura de Remitos en Supabase.
// Encapsula las operaciones contra la tabla 'remitos'.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseRemitoService = {
  async getAllRemitos() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('remitos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseRemitoService] Error al obtener remitos:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseRemitoService] Excepción al consultar remitos:', err.message);
      return [];
    }
  },

  async addRemito(remito) {
    if (!remito) return { success: false, error: 'Datos de remito requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let prods = remito.productos;
      if (typeof prods === 'string') {
        try { prods = JSON.parse(prods); } catch (e) { prods = []; }
      }

      const payload = {
        uuid: remito.uuid || null,
        fecha: remito.fecha || new Date().toISOString(),
        cliente: remito.cliente || '',
        direccion: remito.direccion || '',
        localidad: remito.localidad || '',
        cuit: remito.cuit || '',
        telefono: remito.telefono || '',
        productos: Array.isArray(prods) ? prods : [],
        total: remito.total !== undefined ? Number(remito.total) : 0
      };

      if (remito.id) payload.id = Number(remito.id);

      const onConflictColumn = remito.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('remitos')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseRemitoService] Error al guardar remito:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseRemitoService] Remito guardado en Supabase ID/UUID:', payload.id || payload.uuid || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseRemitoService] Excepción al guardar remito:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteRemito(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de remito requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('remitos').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseRemitoService] Error al eliminar remito ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseRemitoService] Excepción al eliminar remito ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseRemitoService;
