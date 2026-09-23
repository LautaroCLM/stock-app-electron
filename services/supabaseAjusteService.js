// services/supabaseAjusteService.js
//
// Servicio de Lectura/Escritura de Ajustes de Caja en Supabase.
// Encapsula las operaciones contra la tabla 'ajustes_caja' en PostgreSQL (Supabase).

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseAjusteService = {
  /**
   * Obtiene todos los ajustes de caja desde Supabase.
   * 
   * @returns {Promise<Array<object>>} Arreglo de ajustes o [] si hay error/falta de configuración.
   */
  async getAllAjustes() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseAjusteService] Supabase no configurado. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseAjusteService] Cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('ajustes_caja')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseAjusteService] Error al obtener ajustes desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseAjusteService] Excepción al consultar ajustes_caja:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza (upsert) un ajuste en la tabla 'ajustes_caja' en Supabase.
   * 
   * @param {object} ajuste - Objeto con { id, fecha, tipo, motivo, monto, observacion, venta_id }.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addAjuste(ajuste) {
    if (!ajuste) {
      return { success: false, error: 'Datos de ajuste inválidos.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseAjusteService] Supabase no configurado. Omitiendo inserción.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseAjusteService] Cliente Supabase no disponible.');
      return { success: false, error: 'Cliente Supabase no disponible' };
    }

    try {
      const payload = {
        fecha: ajuste.fecha || new Date().toISOString(),
        tipo: ajuste.tipo || '',
        motivo: ajuste.motivo || '',
        monto: ajuste.monto !== undefined ? Number(ajuste.monto) : 0,
        observacion: ajuste.observacion || '',
        venta_id: (ajuste.venta_id !== null && ajuste.venta_id !== undefined && ajuste.venta_id !== '') 
          ? Number(ajuste.venta_id) 
          : null
      };

      if (ajuste.id !== undefined && ajuste.id !== null && ajuste.id !== '') {
        payload.id = Number(ajuste.id);
      }
      if (ajuste.uuid) payload.uuid = ajuste.uuid;
      if (ajuste.venta_uuid) payload.venta_uuid = ajuste.venta_uuid;

      const onConflictTarget = ajuste.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('ajustes_caja')
        .upsert([payload], { onConflict: onConflictTarget });

      if (error) {
        console.error('[SupabaseAjusteService] Error al realizar upsert en ajustes_caja:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseAjusteService] Ajuste guardado exitosamente en Supabase (UUID: ${payload.uuid || 'N/A'}, ID: ${payload.id || 'N/A'})`);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseAjusteService] Excepción al realizar upsert en ajustes_caja:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un ajuste por su UUID o ID de la tabla 'ajustes_caja' en Supabase.
   * 
   * @param {number|string} id - ID del ajuste a eliminar.
   * @param {string} [uuid] - UUID opcional del ajuste a eliminar.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteAjuste(id, uuid = null) {
    if (!id && !uuid) {
      return { success: false, error: 'ID o UUID de ajuste no especificado.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseAjusteService] Supabase no configurado. Omitiendo eliminación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseAjusteService] Cliente Supabase no disponible.');
      return { success: false, error: 'Cliente Supabase no disponible' };
    }

    try {
      let query = client.from('ajustes_caja').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseAjusteService] Error al eliminar ajuste (UUID: ${uuid}, ID: ${id}):`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseAjusteService] Ajuste eliminado exitosamente de Supabase (UUID: ${uuid}, ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseAjusteService] Excepción al eliminar ajuste (UUID: ${uuid}, ID: ${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseAjusteService;
