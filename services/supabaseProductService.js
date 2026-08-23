// services/supabaseProductService.js
//
// Fase 2.3.1 (Paso 1) — Servicio de Lectura de Productos en Supabase.
// Encapsula las operaciones de lectura contra la tabla 'productos' en PostgreSQL (Supabase).
// Garantiza compatibilidad de formato con el servicio SQLite local (productService.js).

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

/**
 * Formatea un registro de producto proveniente de Supabase para garantizar
 * que tenga exactamente el mismo esquema de tipos y nombres de propiedad que SQLite.
 * 
 * @param {object} p - Registro original retornado por Supabase.
 * @returns {object|null} Objeto con formato estandarizado.
 */
function formatProduct(p) {
  if (!p) return null;
  return {
    id: p.id !== undefined && p.id !== null ? Number(p.id) : null,
    codigo: p.codigo !== undefined && p.codigo !== null ? String(p.codigo) : '',
    nombre: p.nombre !== undefined && p.nombre !== null ? String(p.nombre) : '',
    categoria: p.categoria !== undefined && p.categoria !== null ? String(p.categoria) : '',
    stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0,
    unidad: p.unidad !== undefined && p.unidad !== null ? String(p.unidad) : 'un',
    precio_costo: p.precio_costo !== undefined && p.precio_costo !== null ? Number(p.precio_costo) : 0,
    precio: p.precio !== undefined && p.precio !== null ? Number(p.precio) : 0,
    stock_minimo: p.stock_minimo !== undefined && p.stock_minimo !== null ? Number(p.stock_minimo) : 10,
    proveedor_id: p.proveedor_id !== undefined && p.proveedor_id !== null ? Number(p.proveedor_id) : null,
    proveedor_nombre: p.proveedor_nombre 
      ? String(p.proveedor_nombre) 
      : (p.proveedores && p.proveedores.razon_social ? String(p.proveedores.razon_social) : null)
  };
}

const supabaseProductService = {
  /**
   * Obtiene todos los productos ordenados por id descendente desde Supabase.
   * 
   * @returns {Promise<Array<object>>} Lista de productos o [] en caso de error / falta de configuración.
   */
  async getProducts() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no está configurado en .env / config.js. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseProductService] Instancia del cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('productos')
        .select('*, proveedores(razon_social)')
        .order('id', { ascending: false });

      if (error) {
        console.error('[SupabaseProductService] Error al obtener productos desde Supabase:', error.message);
        return [];
      }

      return (data || []).map(formatProduct);
    } catch (err) {
      console.error('[SupabaseProductService] Excepción al consultar la tabla productos:', err.message);
      return [];
    }
  },

  /**
   * Obtiene un producto por su ID en Supabase.
   * 
   * @param {number|string} id - Identificador del producto.
   * @returns {Promise<object|null>} Producto encontrado o null.
   */
  async getProductById(id) {
    if (!id) return null;

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no está configurado. Omitiendo getProductById.');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('productos')
        .select('*, proveedores(razon_social)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`[SupabaseProductService] Error al obtener producto ID ${id}:`, error.message);
        return null;
      }

      return data ? formatProduct(data) : null;
    } catch (err) {
      console.error(`[SupabaseProductService] Excepción al buscar producto ID ${id}:`, err.message);
      return null;
    }
  },

  /**
   * Obtiene un producto por su código en Supabase.
   * 
   * @param {string} code - Código del producto.
   * @returns {Promise<object|null>} Producto encontrado o null.
   */
  async getProductByCode(code) {
    if (!code) return null;

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no está configurado. Omitiendo getProductByCode.');
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('productos')
        .select('*, proveedores(razon_social)')
        .eq('codigo', String(code).trim())
        .maybeSingle();

      if (error) {
        console.error(`[SupabaseProductService] Error al buscar producto con código ${code}:`, error.message);
        return null;
      }

      return data ? formatProduct(data) : null;
    } catch (err) {
      console.error(`[SupabaseProductService] Excepción al buscar producto con código ${code}:`, err.message);
      return null;
    }
  },

  /**
   * Busca productos por coincidencia parcial en nombre, código o categoría en Supabase.
   * 
   * @param {string} query - Término de búsqueda.
   * @returns {Promise<Array<object>>} Lista de productos coincidentes o [].
   */
  async searchProducts(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return this.getProducts();
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no está configurado. Omitiendo searchProducts.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const q = query.trim();
      const { data, error } = await client
        .from('productos')
        .select('*, proveedores(razon_social)')
        .or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%,categoria.ilike.%${q}%`)
        .order('id', { ascending: false });

      if (error) {
        console.error(`[SupabaseProductService] Error al buscar productos con término "${q}":`, error.message);
        return [];
      }

      return (data || []).map(formatProduct);
    } catch (err) {
      console.error(`[SupabaseProductService] Excepción en búsqueda de productos con término "${query}":`, err.message);
      return [];
    }
  },

  /**
   * Inserta un nuevo producto en Supabase.
   * 
   * @param {object} product - Datos del producto (incluyendo id si fue generado en SQLite).
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async createProduct(product) {
    if (!product) return { success: false, error: 'Datos de producto requeridos.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no configurado. Omitiendo creación de producto.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        codigo: product.codigo || '',
        nombre: product.nombre || '',
        categoria: product.categoria || '',
        stock: product.stock !== undefined ? Number(product.stock) : 0,
        precio: product.precio !== undefined ? Number(product.precio) : 0,
        precio_costo: product.precio_costo !== undefined ? Number(product.precio_costo) : 0,
        unidad: product.unidad || 'un',
        stock_minimo: product.stock_minimo !== undefined ? Number(product.stock_minimo) : 10,
        proveedor_id: (product.proveedor_id !== undefined && product.proveedor_id !== null && product.proveedor_id !== '')
          ? Number(product.proveedor_id)
          : null
      };

      if (product.id) payload.id = Number(product.id);

      const { data, error } = await client
        .from('productos')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseProductService] Error al crear producto en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseProductService] Producto guardado en Supabase:', payload.nombre);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseProductService] Excepción al crear producto en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualiza un producto existente en Supabase.
   * 
   * @param {object} product - Datos del producto (debe contener id).
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async updateProduct(product) {
    if (!product || !product.id) {
      return { success: false, error: 'ID de producto requerido.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no configurado. Omitiendo actualización de producto.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        codigo: product.codigo || '',
        nombre: product.nombre || '',
        categoria: product.categoria || '',
        stock: product.stock !== undefined ? Number(product.stock) : 0,
        precio: product.precio !== undefined ? Number(product.precio) : 0,
        precio_costo: product.precio_costo !== undefined ? Number(product.precio_costo) : 0,
        unidad: product.unidad || 'un',
        proveedor_id: (product.proveedor_id !== undefined && product.proveedor_id !== null && product.proveedor_id !== '')
          ? Number(product.proveedor_id)
          : null
      };

      if (product.stock_minimo !== undefined) {
        payload.stock_minimo = Number(product.stock_minimo);
      }

      const { error } = await client
        .from('productos')
        .update(payload)
        .eq('id', product.id);

      if (error) {
        console.error(`[SupabaseProductService] Error al actualizar producto ID ${product.id} en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseProductService] Producto ID ${product.id} actualizado en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseProductService] Excepción al actualizar producto ID ${product.id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un producto de Supabase por ID.
   * 
   * @param {number|string} id - ID del producto.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteProduct(id) {
    if (!id) return { success: false, error: 'ID de producto requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no configurado. Omitiendo eliminación de producto.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[SupabaseProductService] Error al eliminar producto ID ${id} en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseProductService] Producto ID ${id} eliminado en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseProductService] Excepción al eliminar producto ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualiza únicamente la columna de stock de un producto en Supabase.
   * 
   * @param {number|string} id - ID del producto.
   * @param {number} newStock - Nuevo valor de stock.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async updateStock(id, newStock) {
    if (!id) return { success: false, error: 'ID de producto requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseProductService] Supabase no configurado. Omitiendo actualización de stock.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('productos')
        .update({ stock: Number(newStock) })
        .eq('id', id);

      if (error) {
        console.error(`[SupabaseProductService] Error al actualizar stock de producto ID ${id} en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseProductService] Stock de producto ID ${id} actualizado a ${newStock} en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseProductService] Excepción al actualizar stock de producto ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseProductService;

