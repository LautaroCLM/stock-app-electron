// services/supabasePurchaseService.js
//
// Fase 5 (Paso 2 Módulo Proveedores) — Servicio de Comunicación con Supabase para Compras, Pagos y Cuenta Corriente.
// Encapsula las operaciones remotas contra las tablas 'compras_proveedor', 'pagos_proveedor' y 'cuenta_corriente_proveedor' en Supabase.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabasePurchaseService = {

  // ── COMPRAS DE PROVEEDORES ────────────────────────────────────────────────

  /**
   * Obtiene todas las compras registradas en Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllPurchases() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('compras_proveedor')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabasePurchaseService] Error al obtener compras desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabasePurchaseService] Excepción al obtener compras desde Supabase:', err.message);
      return [];
    }
  },

  /**
   * Agrega o actualiza una compra en Supabase.
   * @param {object} compra - Datos de la compra.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addPurchase(compra) {
    if (!compra || !compra.proveedor_id) {
      return { success: false, error: 'Proveedor ID requerido.' };
    }
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        proveedor_id: Number(compra.proveedor_id),
        fecha: compra.fecha || new Date().toISOString().split('T')[0],
        descripcion: compra.descripcion || null,
        total: parseFloat(compra.total) || 0,
        metodo_pago: compra.metodo_pago || 'Efectivo',
        estado: compra.estado || 'Pagado',
        observaciones: compra.observaciones || null
      };

      if (compra.id) payload.id = Number(compra.id);

      const { error } = await client
        .from('compras_proveedor')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabasePurchaseService] Error al guardar compra en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabasePurchaseService] Compra guardada en Supabase:', payload);
      return { success: true };
    } catch (err) {
      console.error('[SupabasePurchaseService] Excepción al guardar compra en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una compra en Supabase por ID.
   * @param {number|string} id - ID de la compra.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deletePurchase(id) {
    if (!id) return { success: false, error: 'ID de compra requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('compras_proveedor')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabasePurchaseService] Error al eliminar compra ID ${id} en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabasePurchaseService] Compra ID ${id} eliminada en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabasePurchaseService] Excepción al eliminar compra ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  },


  // ── PAGOS A PROVEEDORES ───────────────────────────────────────────────────

  /**
   * Obtiene todos los pagos registrados en Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllPayments() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('pagos_proveedor')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabasePurchaseService] Error al obtener pagos desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabasePurchaseService] Excepción al obtener pagos desde Supabase:', err.message);
      return [];
    }
  },

  /**
   * Agrega o actualiza un pago en Supabase.
   * @param {object} pago - Datos del pago.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addPayment(pago) {
    if (!pago || !pago.proveedor_id) {
      return { success: false, error: 'Proveedor ID requerido.' };
    }
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        proveedor_id: Number(pago.proveedor_id),
        compra_id: pago.compra_id ? Number(pago.compra_id) : null,
        fecha: pago.fecha || new Date().toISOString().split('T')[0],
        monto: parseFloat(pago.monto) || 0,
        metodo_pago: pago.metodo_pago || 'Efectivo',
        comprobante: pago.comprobante || null,
        observaciones: pago.observaciones || null
      };

      if (pago.id) payload.id = Number(pago.id);

      const { error } = await client
        .from('pagos_proveedor')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabasePurchaseService] Error al guardar pago en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabasePurchaseService] Pago guardado en Supabase:', payload);
      return { success: true };
    } catch (err) {
      console.error('[SupabasePurchaseService] Excepción al guardar pago en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un pago en Supabase por ID.
   * @param {number|string} id - ID del pago.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deletePayment(id) {
    if (!id) return { success: false, error: 'ID de pago requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('pagos_proveedor')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabasePurchaseService] Error al eliminar pago ID ${id} en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabasePurchaseService] Pago ID ${id} eliminado en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabasePurchaseService] Excepción al eliminar pago ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  },


  // ── CUENTA CORRIENTE DE PROVEEDORES ───────────────────────────────────────

  /**
   * Obtiene todos los movimientos de cuenta corriente desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllAccountMovements() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('cuenta_corriente_proveedor')
        .select('*')
        .order('fecha', { ascending: true });

      if (error) {
        console.error('[SupabasePurchaseService] Error al obtener movimientos de cta. cte. desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabasePurchaseService] Excepción al obtener movimientos desde Supabase:', err.message);
      return [];
    }
  },

  /**
   * Agrega o actualiza un movimiento de cuenta corriente en Supabase.
   * @param {object} mov - Datos del movimiento.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addAccountMovement(mov) {
    if (!mov || !mov.proveedor_id) {
      return { success: false, error: 'Proveedor ID requerido.' };
    }
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        proveedor_id: Number(mov.proveedor_id),
        fecha: mov.fecha || new Date().toISOString().split('T')[0],
        tipo: mov.tipo || 'Ajuste',
        descripcion: mov.descripcion || null,
        debito: parseFloat(mov.debito) || 0,
        credito: parseFloat(mov.credito) || 0,
        referencia_id: mov.referencia_id ? Number(mov.referencia_id) : null,
        fecha_vencimiento: mov.fecha_vencimiento || null,
        estado_pago: mov.estado_pago || 'Pendiente'
      };

      if (mov.id) payload.id = Number(mov.id);

      const { error } = await client
        .from('cuenta_corriente_proveedor')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabasePurchaseService] Error al guardar movimiento de cta. cte. en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabasePurchaseService] Movimiento guardado en Supabase:', payload);
      return { success: true };
    } catch (err) {
      console.error('[SupabasePurchaseService] Excepción al guardar movimiento en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un movimiento de cuenta corriente por referencia ID y tipo.
   * @param {number|string} referenciaId - ID de la compra o pago vinculado.
   * @param {string} tipo - 'Compra' o 'Pago'.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteAccountMovementByRef(referenciaId, tipo) {
    if (!referenciaId || !tipo) return { success: false, error: 'Referencia ID y Tipo requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('cuenta_corriente_proveedor')
        .delete()
        .eq('referencia_id', Number(referenciaId))
        .eq('tipo', tipo);

      if (error) {
        console.error(`[SupabasePurchaseService] Error al eliminar movimiento ref ${referenciaId} (${tipo}) en Supabase:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabasePurchaseService] Excepción al eliminar movimiento ref ${referenciaId}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabasePurchaseService;
