// services/supabaseClientService.js
//
// Servicio de Lectura/Escritura de Clientes y Cuenta Corriente de Clientes en Supabase.
// Encapsula las operaciones contra las tablas 'clientes', 'pagos_cliente' y 'cuenta_corriente_cliente'.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseClientService = {
  // ── CLIENTES ───────────────────────────────────────────────────────────────
  /**
   * Obtiene todos los clientes desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllClients() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseClientService] Supabase no está configurado. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('clientes')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('[SupabaseClientService] Error al obtener clientes desde Supabase:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al consultar clientes:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza un cliente en Supabase.
   * @param {object} cliente - Objeto cliente con { id, nombre, telefono, email, direccion, cuit, observaciones, estado }.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addClient(cliente) {
    if (!cliente) return { success: false, error: 'Datos de cliente requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: cliente.uuid || null,
        nombre: cliente.nombre || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        direccion: cliente.direccion || '',
        cuit: cliente.cuit || '',
        observaciones: cliente.observaciones || '',
        estado: cliente.estado || 'Activo'
      };

      let query;
      if (payload.uuid) {
        query = client.from('clientes').upsert(payload, { onConflict: 'uuid' });
      } else {
        query = client.from('clientes').insert(payload);
      }

      const { error } = await query;

      if (error) {
        console.error('[SupabaseClientService] Error al insertar/actualizar cliente:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseClientService] Cliente guardado en Supabase:', payload.nombre);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al guardar cliente:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualiza un cliente existente en Supabase.
   * @param {object} cliente
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async updateClient(cliente) {
    return this.addClient(cliente);
  },

  /**
   * Elimina un cliente por su ID en Supabase.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteClient(target) {
    if (!target) return { success: false, error: 'ID o UUID de cliente requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    const uuid = typeof target === 'object' ? target.uuid : (typeof target === 'string' && target.includes('-') ? target : null);
    const id = typeof target === 'object' ? target.id : (typeof target === 'number' || (typeof target === 'string' && !target.includes('-')) ? Number(target) : null);

    try {
      let query = client.from('clientes').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else if (id) {
        query = query.eq('id', Number(id));
      } else {
        return { success: false, error: 'UUID o ID no válido para eliminación.' };
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseClientService] Error al eliminar cliente:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseClientService] Cliente eliminado en Supabase (UUID: ${uuid}, ID: ${id}).`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseClientService] Excepción al eliminar cliente:`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── PAGOS CLIENTE ──────────────────────────────────────────────────────────
  /**
   * Obtiene todos los pagos de clientes desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllPayments() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('pagos_cliente')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('[SupabaseClientService] Error al obtener pagos de cliente:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al consultar pagos_cliente:', err.message);
      return [];
    }
  },

  /**
   * Inserta un pago de cliente en Supabase.
   * @param {object} pago
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addPayment(pago) {
    if (!pago) return { success: false, error: 'Datos de pago requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        cliente_id: Number(pago.cliente_id),
        fecha: pago.fecha || new Date().toISOString(),
        monto: pago.monto !== undefined ? Number(pago.monto) : 0,
        metodo_pago: pago.metodo_pago || 'Efectivo',
        comprobante: pago.comprobante || '',
        observaciones: pago.observaciones || ''
      };

      if (pago.id) payload.id = Number(pago.id);

      const { error } = await client
        .from('pagos_cliente')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseClientService] Error al guardar pago_cliente:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseClientService] Pago cliente guardado en Supabase ID:', payload.id || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al guardar pago_cliente:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un pago de cliente por ID en Supabase.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deletePayment(id) {
    if (!id) return { success: false, error: 'ID de pago requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('pagos_cliente')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseClientService] Error al eliminar pago_cliente ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseClientService] Excepción al eliminar pago_cliente ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── CUENTA CORRIENTE CLIENTE ───────────────────────────────────────────────
  /**
   * Obtiene todos los movimientos de cuenta corriente de clientes desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllAccountMovements() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('cuenta_corriente_cliente')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('[SupabaseClientService] Error al obtener cta. cte. clientes:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al consultar cuenta_corriente_cliente:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza un movimiento de cta. cte. cliente en Supabase.
   * @param {object} movimiento
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addAccountMovement(movimiento) {
    if (!movimiento) return { success: false, error: 'Datos de movimiento requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        cliente_id: Number(movimiento.cliente_id),
        fecha: movimiento.fecha || new Date().toISOString(),
        tipo: movimiento.tipo || 'Venta',
        descripcion: movimiento.descripcion || '',
        debito: movimiento.debito !== undefined ? Number(movimiento.debito) : 0,
        credito: movimiento.credito !== undefined ? Number(movimiento.credito) : 0,
        referencia_id: movimiento.referencia_id ? Number(movimiento.referencia_id) : null
      };

      if (movimiento.id) payload.id = Number(movimiento.id);

      const { error } = await client
        .from('cuenta_corriente_cliente')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseClientService] Error al guardar cta. cte. cliente en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseClientService] Movimiento cta. cte. cliente guardado en Supabase ID:', payload.id || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al guardar cta. cte. cliente:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un movimiento de cta. cte. cliente por ID o por referencia.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteAccountMovement(id) {
    if (!id) return { success: false, error: 'ID de movimiento requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('cuenta_corriente_cliente')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseClientService] Error al eliminar cta. cte. cliente ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseClientService] Excepción al eliminar cta. cte. cliente ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  },
  // ── VENTAS CLIENTE A CUENTA CORRIENTE ───────────────────────────────
  /**
   * Obtiene todas las ventas a cuenta corriente de clientes desde Supabase.
   * @returns {Promise<Array<object>>}
   */
  async getAllSales() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('cliente_ventas')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseClientService] Error al obtener cliente_ventas:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al consultar cliente_ventas:', err.message);
      return [];
    }
  },

  /**
   * Inserta o actualiza una venta a cuenta corriente de cliente en Supabase.
   * @param {object} sale
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addSale(sale) {
    if (!sale) return { success: false, error: 'Datos de venta requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let productosPayload = sale.productos;
      if (typeof productosPayload === 'string') {
        try {
          productosPayload = JSON.parse(productosPayload);
        } catch (e) {
          productosPayload = [];
        }
      }

      const payload = {
        cliente_id: Number(sale.cliente_id),
        fecha: sale.fecha || new Date().toISOString().split('T')[0],
        fecha_estimada_cobro: sale.fecha_estimada_cobro || null,
        comprobante: sale.comprobante || '',
        observaciones: sale.observaciones || '',
        total: sale.total !== undefined ? Number(sale.total) : 0,
        saldo_pendiente: sale.saldo_pendiente !== undefined ? Number(sale.saldo_pendiente) : Number(sale.total || 0),
        estado: sale.estado || 'Pendiente',
        productos: Array.isArray(productosPayload) ? productosPayload : []
      };

      if (sale.id) payload.id = Number(sale.id);

      const { error } = await client
        .from('cliente_ventas')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseClientService] Error al insertar/actualizar cliente_ventas:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseClientService] Venta cliente guardada en Supabase ID:', payload.id || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseClientService] Excepción al guardar cliente_ventas:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una venta a cuenta corriente por ID en Supabase.
   * @param {number|string} id
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteSale(id) {
    if (!id) return { success: false, error: 'ID de venta requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('cliente_ventas')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseClientService] Error al eliminar cliente_ventas ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseClientService] Excepción al eliminar cliente_ventas ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseClientService;
