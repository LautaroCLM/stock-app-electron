// services/supabaseSupplierService.js
//
// Fase 2.2 (Paso 2) — Servicio de Lectura de Proveedores en Supabase.
// Encapsula las operaciones de lectura contra la tabla 'proveedores' en PostgreSQL (Supabase).
// Garantiza compatibilidad de formato con el servicio SQLite local.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseSupplierService = {
  /**
   * Obtiene todos los proveedores ordenados por razón social desde la tabla 'proveedores' en Supabase.
   * Retorna un arreglo de objetos de JavaScript con la misma estructura que la versión SQLite.
   * 
   * @returns {Promise<Array<object>>} Arreglo de proveedores o [] si hay error / falta de configuración.
   */
  async getAllSuppliers() {
    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSupplierService] Supabase no está configurado en .env / config.js. Omitiendo consulta.');
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('[SupabaseSupplierService] Instancia del cliente Supabase no disponible.');
      return [];
    }

    try {
      const { data, error } = await client
        .from('proveedores')
        .select('*')
        .order('razon_social', { ascending: true });

      if (error) {
        console.error('[SupabaseSupplierService] Error al obtener proveedores desde Supabase:', error.message);
        return [];
      }

      // Mapear el resultado para garantizar los campos deuda_actual y ultima_compra que la UI espera
      const formattedSuppliers = (data || []).map(p => ({
        id: p.id,
        razon_social: p.razon_social || '',
        contacto: p.contacto || null,
        telefono: p.telefono || null,
        email: p.email || null,
        direccion: p.direccion || null,
        ciudad: p.ciudad || null,
        provincia: p.provincia || null,
        cuit: p.cuit || null,
        observaciones: p.observaciones || null,
        estado: p.estado || 'Activo',
        created_at: p.created_at || null,
        deuda_actual: p.deuda_actual !== undefined ? p.deuda_actual : 0,
        ultima_compra: p.ultima_compra || null
      }));

      return formattedSuppliers;
    } catch (err) {
      console.error('[SupabaseSupplierService] Excepción al consultar la tabla proveedores:', err.message);
      return [];
    }
  },

  /**
   * Inserta un nuevo proveedor en Supabase.
   * 
   * @param {object} prov - Datos del proveedor (incluyendo id si fue generado en SQLite).
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async addSupplier(prov) {
    if (!prov || !prov.razon_social) {
      return { success: false, error: 'Razón social requerida.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSupplierService] Supabase no configurado. Omitiendo creación de proveedor.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: prov.uuid || null,
        razon_social: prov.razon_social.trim(),
        contacto: prov.contacto || null,
        telefono: prov.telefono || null,
        email: prov.email || null,
        direccion: prov.direccion || null,
        ciudad: prov.ciudad || null,
        provincia: prov.provincia || null,
        cuit: prov.cuit || null,
        observaciones: prov.observaciones || null,
        estado: prov.estado || 'Activo'
      };

      let query;
      if (payload.uuid) {
        query = client.from('proveedores').upsert(payload, { onConflict: 'uuid' }).select();
      } else {
        query = client.from('proveedores').insert(payload).select();
      }

      const { data, error } = await query;

      console.log('[SupabaseSupplierService] Payload enviado:', payload);
      console.log('[SupabaseSupplierService] Registro devuelto:', data);

      if (error) {
        console.error('[SupabaseSupplierService] Error al agregar proveedor en Supabase:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseSupplierService] Proveedor guardado en Supabase:', payload.razon_social);
      return { success: true };
    } catch (err) {
      console.error('[SupabaseSupplierService] Excepción al agregar proveedor en Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualiza un proveedor en Supabase.
   * 
   * @param {object} prov - Datos del proveedor.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async updateSupplier(prov) {
    if (!prov || (!prov.id && !prov.uuid)) {
      return { success: false, error: 'ID o UUID de proveedor requerido.' };
    }

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSupplierService] Supabase no configurado. Omitiendo actualización de proveedor.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: prov.uuid || null,
        razon_social: prov.razon_social?.trim() || '',
        contacto: prov.contacto || null,
        telefono: prov.telefono || null,
        email: prov.email || null,
        direccion: prov.direccion || null,
        ciudad: prov.ciudad || null,
        provincia: prov.provincia || null,
        cuit: prov.cuit || null,
        observaciones: prov.observaciones || null,
        estado: prov.estado || 'Activo'
      };

      let query;
      if (payload.uuid) {
        query = client.from('proveedores').update(payload).eq('uuid', payload.uuid);
      } else {
        query = client.from('proveedores').update(payload).eq('id', prov.id);
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseSupplierService] Error al actualizar proveedor:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSupplierService] Proveedor actualizado en Supabase (UUID: ${payload.uuid}, ID: ${prov.id}).`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseSupplierService] Excepción al actualizar proveedor:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina un proveedor en Supabase por ID o UUID.
   * 
   * @param {object|number|string} target - Datos o ID/UUID del proveedor.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteSupplier(target) {
    if (!target) return { success: false, error: 'ID o UUID de proveedor requerido.' };

    if (!isSupabaseConfigured()) {
      console.warn('[SupabaseSupplierService] Supabase no configurado. Omitiendo eliminación de proveedor.');
      return { success: false, error: 'Supabase no configurado' };
    }

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    const uuid = typeof target === 'object' ? target.uuid : (typeof target === 'string' && target.includes('-') ? target : null);
    const id = typeof target === 'object' ? target.id : (typeof target === 'number' || (typeof target === 'string' && !target.includes('-')) ? Number(target) : null);

    try {
      let query = client.from('proveedores').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else if (id) {
        query = query.eq('id', Number(id));
      } else {
        return { success: false, error: 'UUID o ID no válido para eliminación.' };
      }

      const { data, error } = await query.select();

      if (error) {
        console.error(`[SupabaseSupplierService] Error al eliminar proveedor:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseSupplierService] Proveedor eliminado en Supabase (UUID: ${uuid}, ID: ${id}).`);
      return { success: true, deleted: data };
    } catch (err) {
      console.error(`[SupabaseSupplierService] Excepción al eliminar proveedor:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseSupplierService;

