// services/supabaseExpenseService.js
//
// Servicio de Lectura/Escritura de Gastos en Supabase.
// Encapsula las operaciones contra la tabla 'gastos' en PostgreSQL (Supabase).

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseExpenseService = {
  /**
   * Obtiene todos los gastos desde la tabla 'gastos' en Supabase.
   * 
   * @returns {Promise<Array<object>>} Arreglo de gastos o [] si hay error/falta de configuración.
   */
  async getAllExpenses() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseExpenseService] Supabase no está configurado en .env / config.js. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseExpenseService] Instancia del cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('gastos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseExpenseService] Error al obtener gastos desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseExpenseService] Excepción al consultar la tabla gastos:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza (upsert) un gasto en la tabla 'gastos' en Supabase.
   * 
   * @param {object} gasto - Objeto de gasto con { id, fecha, concepto, categoria, monto, observacion, estado }.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addExpense(gasto) {
    if (!gasto) {
      return { success: false, error: 'Datos de gasto inválidos.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseExpenseService] Supabase no configurado. Omitiendo creación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        fecha: gasto.fecha || new Date().toISOString().split('T')[0],
        concepto: gasto.concepto || '',
        categoria: gasto.categoria || '',
        monto: gasto.monto !== undefined ? Number(gasto.monto) : 0,
        observacion: gasto.observacion || '',
        estado: gasto.estado || 'Pendiente'
      };

      if (gasto.id) payload.id = Number(gasto.id);
      if (gasto.uuid) payload.uuid = gasto.uuid;

      const onConflictTarget = gasto.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('gastos')
        .upsert(payload, { onConflict: onConflictTarget });

      if (error) {
        console.error('[SupabaseExpenseService] Error al insertar/actualizar gasto en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseExpenseService] Gasto guardado en Supabase (UUID:', payload.uuid || 'N/A', 'ID:', payload.id || 'N/A', ')');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseExpenseService] Excepción al guardar gasto en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un gasto por su UUID o ID en Supabase.
   * 
   * @param {number|string} id - ID del gasto a eliminar.
   * @param {string} [uuid] - UUID opcional del gasto a eliminar.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteExpense(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de gasto requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseExpenseService] Supabase no configurado. Omitiendo eliminación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('gastos').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseExpenseService] Error al eliminar gasto (UUID: ${uuid}, ID: ${id}):`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseExpenseService] Gasto eliminado en Supabase (UUID: ${uuid}, ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseExpenseService] Excepción al eliminar gasto (UUID: ${uuid}, ID: ${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseExpenseService;
