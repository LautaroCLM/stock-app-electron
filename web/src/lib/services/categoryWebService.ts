import { supabase } from '../supabase/client';

export interface CategoryItem {
  id?: number;
  nombre: string;
}

export const categoryWebService = {
  /**
   * Obtiene la lista completa de categorías desde Supabase (tabla 'categorias' + fallback 'productos')
   * ordenadas alfabéticamente y sin duplicados.
   */
  async getCategories(): Promise<string[]> {
    try {
      // 1. Obtener desde la tabla 'categorias'
      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('nombre')
        .order('nombre', { ascending: true });

      if (catError) {
        console.warn('[categoryWebService] Advertencia al consultar tabla categorias:', catError.message);
      }

      // 2. Obtener desde la tabla 'productos' para garantizar consistencia
      const { data: prodData } = await supabase
        .from('productos')
        .select('categoria');

      const set = new Set<string>();

      catData?.forEach((c) => {
        if (c.nombre && c.nombre.trim()) set.add(c.nombre.trim());
      });

      prodData?.forEach((p) => {
        if (p.categoria && p.categoria.trim()) set.add(p.categoria.trim());
      });

      if (set.size === 0) {
        set.add('General');
      }

      return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    } catch (err) {
      console.error('[categoryWebService] Error obteniendo categorías:', err);
      return ['General'];
    }
  },

  /**
   * Registra una nueva categoría en Supabase si no existe previamente.
   */
  async createCategory(nombre: string): Promise<string> {
    const trimmed = nombre.trim();
    if (!trimmed) {
      throw new Error('El nombre de la categoría no puede estar vacío.');
    }

    // 1. Buscar existencia previa sin distinción de mayúsculas/minúsculas
    const { data: existing } = await supabase
      .from('categorias')
      .select('nombre')
      .ilike('nombre', trimmed)
      .maybeSingle();

    if (existing?.nombre) {
      return existing.nombre;
    }

    // 2. Insertar nueva categoría en Supabase
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre: trimmed })
      .select('nombre')
      .single();

    if (error) {
      // Si el error es por conflicto de duplicado UNIQUE (code 23505)
      if (error.code === '23505') {
        return trimmed;
      }
      console.error('[categoryWebService] Error al insertar categoría en Supabase:', error.message);
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    return data?.nombre || trimmed;
  },
};
