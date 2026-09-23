// services/supabaseBudgetService.js
//
// Servicio de Lectura/Escritura de Presupuestos en Supabase.
// Encapsula las operaciones contra la tabla 'presupuestos'.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseBudgetService = {
  async getAllBudgets() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('presupuestos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseBudgetService] Error al obtener presupuestos:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseBudgetService] Excepción al consultar presupuestos:', err.message);
      return [];
    }
  },

  async addBudget(budget) {
    if (!budget) return { success: false, error: 'Datos de presupuesto requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let prods = budget.productos;
      if (typeof prods === 'string') {
        try { prods = JSON.parse(prods); } catch (e) { prods = []; }
      }

      const payload = {
        uuid: budget.uuid || null,
        fecha: budget.fecha || new Date().toISOString(),
        cliente: budget.cliente || '',
        direccion: budget.direccion || '',
        localidad: budget.localidad || '',
        cuit: budget.cuit || '',
        telefono: budget.telefono || '',
        productos: Array.isArray(prods) ? prods : [],
        total: budget.total !== undefined ? Number(budget.total) : 0
      };

      if (budget.id) payload.id = Number(budget.id);

      const onConflictColumn = budget.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('presupuestos')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseBudgetService] Error al guardar presupuesto:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseBudgetService] Presupuesto guardado en Supabase ID/UUID:', payload.id || payload.uuid || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseBudgetService] Excepción al guardar presupuesto:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteBudget(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de presupuesto requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('presupuestos').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseBudgetService] Error al eliminar presupuesto ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseBudgetService] Excepción al eliminar presupuesto ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseBudgetService;
