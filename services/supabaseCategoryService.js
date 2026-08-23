// services/supabaseCategoryService.js
//
// Fase 2.0 (Paso 1) — Servicio de Lectura de Categorías en Supabase.
// Encapsula las operaciones de lectura contra la tabla 'categorias' en PostgreSQL (Supabase).

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseCategoryService = {
  /**
   * Obtiene todas las categorías ordenadas por nombre desde la tabla 'categorias' en Supabase.
   * 
   * @returns {Promise<Array<{id: number, nombre: string}>>} Arreglo de categorías o [] si hay error/falta de configuración.
   */
  async getAllCategories() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseCategoryService] Supabase no está configurado en .env / config.js. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseCategoryService] Instancia del cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('categorias')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('[SupabaseCategoryService] Error al obtener categorías desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseCategoryService] Excepción al consultar la tabla categorias:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza (upsert) una categoría en Supabase.
   * 
   * @param {object} category - Objeto de categoría con { id, nombre }.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async createCategory(category) {
    if (!category || !category.nombre) {
      return { success: false, error: 'Datos de categoría inválidos.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseCategoryService] Supabase no configurado. Omitiendo creación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = { nombre: String(category.nombre).trim() };
      if (category.id) payload.id = Number(category.id);

      const { data, error } = await client
        .from('categorias')
        .upsert(payload, { onConflict: 'nombre' });

      if (error) {
        console.error('[SupabaseCategoryService] Error al insertar categoría en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseCategoryService] Categoría guardada en Supabase:', payload.nombre);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseCategoryService] Excepción al guardar categoría en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una categoría por su ID o nombre en Supabase.
   * 
   * @param {number|string} id - ID de la categoría.
   * @param {string} [nombre] - Nombre opcional de la categoría como fallback de borrado.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteCategory(id, nombre) {
    if (!id && !nombre) return { success: false, error: 'ID o Nombre requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseCategoryService] Supabase no configurado. Omitiendo eliminación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('categorias').delete();
      if (id) {
        query = query.eq('id', id);
      } else {
        query = query.eq('nombre', nombre);
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseCategoryService] Error al eliminar categoría ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseCategoryService] Categoría eliminada en Supabase (ID: ${id || nombre})`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseCategoryService] Excepción al eliminar categoría ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseCategoryService;

