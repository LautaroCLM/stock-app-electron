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

      const { error } = await client
        .from('ajustes_caja')
        .upsert([payload], { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseAjusteService] Error al realizar upsert en ajustes_caja:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseAjusteService] Ajuste guardado exitosamente en Supabase (ID: ${payload.id || 'N/A'})`);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseAjusteService] Excepción al realizar upsert en ajustes_caja:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un ajuste por su ID de la tabla 'ajustes_caja' en Supabase.
   * 
   * @param {number|string} id - ID del ajuste a eliminar.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteAjuste(id) {
    if (!id) {
      return { success: false, error: 'ID de ajuste no especificado.' };
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
      const numericId = Number(id);
      const { error } = await client
        .from('ajustes_caja')
        .delete()
        .eq('id', numericId);

      if (error) {
        console.error(`[SupabaseAjusteService] Error al eliminar ajuste con ID ${numericId} en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseAjusteService] Ajuste eliminado exitosamente de Supabase (ID: ${numericId})`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseAjusteService] Excepción al eliminar ajuste con ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseAjusteService;
