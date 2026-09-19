// services/supabaseSaleService.js
//
// Fase 6 (Sub-paso 3 Módulo Ventas) — Servicio de Lectura/Escritura de Ventas en Supabase.
// Encapsula las operaciones de acceso a la tabla 'ventas' en PostgreSQL (Supabase).

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseSaleService = {
  /**
   * Obtiene todas las ventas desde la tabla 'ventas' en Supabase.
   * 
   * @returns {Promise<Array<object>>} Arreglo de ventas o [] si hay error/falta de configuración.
   */
  async getAllSales() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSaleService] Supabase no está configurado en .env / config.js. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseSaleService] Instancia del cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseSaleService] Error al obtener ventas desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseSaleService] Excepción al consultar la tabla ventas:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza (upsert) una venta en la tabla 'ventas' en Supabase.
   * 
   * @param {object} venta - Objeto de venta con { id, producto_id, cantidad, total, metodo_pago, cliente, fecha }.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addSale(venta) {
    if (!venta) {
      return { success: false, error: 'Datos de venta inválidos.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSaleService] Supabase no configurado. Omitiendo creación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        producto_id: venta.producto_id ? Number(venta.producto_id) : null,
        cantidad: venta.cantidad !== undefined ? Number(venta.cantidad) : 1,
        total: venta.total !== undefined ? Number(venta.total) : 0,
        metodo_pago: venta.metodo_pago || 'Efectivo',
        cliente: venta.cliente || 'Consumidor Final',
        fecha: venta.fecha || new Date().toISOString()
      };

      if (venta.id) payload.id = Number(venta.id);
      if (venta.client_transaction_id) payload.client_transaction_id = venta.client_transaction_id;

      const { error } = await client
        .from('ventas')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseSaleService] Error al insertar venta en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseSaleService] Venta guardada en Supabase:', payload);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseSaleService] Excepción al guardar venta en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una venta por su ID en Supabase.
   * 
   * @param {number|string} id - ID de la venta a eliminar.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteSale(id) {
    if (!id) return { success: false, error: 'ID de venta requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSaleService] Supabase no configurado. Omitiendo eliminación.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('ventas')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseSaleService] Error al eliminar venta ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSaleService] Venta eliminada en Supabase (ID: ${id})`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseSaleService] Excepción al eliminar venta ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  },
  /**
   * Procesa la venta atómica en Supabase utilizando la función RPC 'procesar_venta_multiproducto'.
   * Ejecuta en una sola transacción PostgreSQL: bloqueo de filas FOR UPDATE (orden ascendente por producto_id),
   * validación de stock, resta atómica e inserción de registros en la tabla 'ventas'.
   * 
   * @param {object} params
   * @param {Array<{ producto_id: number, cantidad: number, total: number }>} params.items - Arreglo de ítems vendidos con su total asignado.
   * @param {string} [params.metodo_pago='Efectivo'] - Método de pago.
   * @param {string} [params.cliente='Consumidor Final'] - Nombre del cliente.
   * @param {string} [params.client_transaction_id=null] - UUID v4 global de operación de venta.
   * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
   */
  async processCartSaleAtomic({ items, metodo_pago = 'Efectivo', cliente = 'Consumidor Final', client_transaction_id = null }) {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'El carrito no contiene productos para procesar.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible.' };

    try {
      const payloadItems = items.map(item => {
        const mapped = {
          producto_id: Number(item.producto_id || item.id),
          cantidad: Number(item.cantidad || 1),
          total: Number(item.total || 0)
        };
        if (item.nombre) mapped.nombre = item.nombre;
        if (item.precio !== undefined && item.precio !== null) mapped.precio = Number(item.precio);
        return mapped;
      });

      const rpcParams = {
        p_items: payloadItems,
        p_metodo_pago: metodo_pago || 'Efectivo',
        p_cliente: cliente || 'Consumidor Final'
      };
      if (client_transaction_id) {
        rpcParams.p_client_transaction_id = client_transaction_id;
      }

      const { data, error } = await client.rpc('procesar_venta_multiproducto', rpcParams);

      if (error) {
        console.error('[SupabaseSaleService] Error en RPC procesar_venta_multiproducto:', error.message);
        const isNetworkError = Boolean(
          error.message && (
            error.message.includes('fetch failed') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('network') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('ETIMEDOUT')
          )
        );
        return { success: false, isNetworkError, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'La RPC no devolvió respuesta de confirmación.' };
      }

      if (data.success === false || data.error) {
        const errorMsg = data.error || 'Error en procesar_venta_multiproducto';
        console.error('[SupabaseSaleService] RPC procesar_venta_multiproducto rechazó la venta:', errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log('[SupabaseSaleService] Venta atómica procesada con éxito en Supabase:', data);
      return { success: true, data };
    } catch (err) {
      console.error('[SupabaseSaleService] Excepción en processCartSaleAtomic:', err.message);
      const isNetworkError = Boolean(
        err.message && (
          err.message.includes('fetch failed') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('network') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('ECONNREFUSED')
        )
      );
      return { success: false, isNetworkError, error: err.message };
    }
  }
};

module.exports = supabaseSaleService;
