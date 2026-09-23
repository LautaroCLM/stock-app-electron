// services/supabaseMachineService.js
//
// Servicio de Lectura/Escritura del Módulo Máquinas en Supabase.
// Encapsula las operaciones contra las tablas 'maquinas', 'trabajos_maquinas',
// 'combustible_maquinas' y 'mantenimiento_maquinas'.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseMachineService = {
  // ── MAQUINAS ───────────────────────────────────────────────────────────────
  async getAllMachines() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('maquinas')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('[SupabaseMachineService] Error al obtener máquinas:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al consultar maquinas:', err.message);
      return [];
    }
  },

  async addMachine(maquina) {
    if (!maquina) return { success: false, error: 'Datos de máquina requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: maquina.uuid || null,
        nombre: maquina.nombre || '',
        tipo: maquina.tipo || '',
        marca: maquina.marca || '',
        modelo: maquina.modelo || '',
        anio: maquina.anio ? Number(maquina.anio) : null,
        numero_serie: maquina.numero_serie || '',
        valor_hora: maquina.valor_hora !== undefined ? Number(maquina.valor_hora) : 0,
        horas_totales: maquina.horas_totales !== undefined ? Number(maquina.horas_totales) : 0,
        ultimo_servicio: maquina.ultimo_servicio || null,
        estado: maquina.estado || 'Disponible',
        observaciones: maquina.observaciones || ''
      };

      if (maquina.id) payload.id = Number(maquina.id);

      const onConflictColumn = maquina.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('maquinas')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseMachineService] Error al guardar máquina:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseMachineService] Máquina guardada en Supabase ID/UUID:', payload.id || payload.uuid || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al guardar máquina:', err.message);
      return { success: false, error: err.message };
    }
  },

  async updateMachine(maquina) {
    return this.addMachine(maquina);
  },

  async deleteMachine(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de máquina requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('maquinas').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseMachineService] Error al eliminar máquina ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseMachineService] Máquina ID/UUID ${uuid || id} eliminada en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseMachineService] Excepción al eliminar máquina ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── TRABAJOS MAQUINAS ──────────────────────────────────────────────────────
  async getAllWorkLogs() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('trabajos_maquinas')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseMachineService] Error al obtener trabajos_maquinas:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al consultar trabajos_maquinas:', err.message);
      return [];
    }
  },

  async addWorkLog(trabajo) {
    if (!trabajo) return { success: false, error: 'Datos de trabajo requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: trabajo.uuid || null,
        maquina_id: trabajo.maquina_id ? Number(trabajo.maquina_id) : null,
        maquina_uuid: trabajo.maquina_uuid || null,
        fecha: trabajo.fecha || new Date().toISOString().split('T')[0],
        cliente: trabajo.cliente || '',
        operador: trabajo.operador || '',
        horas: trabajo.horas !== undefined ? Number(trabajo.horas) : 0,
        precio_hora: trabajo.precio_hora !== undefined ? Number(trabajo.precio_hora) : 0,
        total: trabajo.total !== undefined ? Number(trabajo.total) : 0,
        observaciones: trabajo.observaciones || ''
      };

      if (trabajo.id) payload.id = Number(trabajo.id);

      const onConflictColumn = trabajo.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('trabajos_maquinas')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseMachineService] Error al guardar trabajo de máquina:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al guardar trabajo_maquinas:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteWorkLog(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de trabajo requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('trabajos_maquinas').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseMachineService] Error al eliminar trabajo_maquinas ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseMachineService] Excepción al eliminar trabajo_maquinas ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── COMBUSTIBLE MAQUINAS ───────────────────────────────────────────────────
  async getAllFuelLogs() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('combustible_maquinas')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseMachineService] Error al obtener combustible_maquinas:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al consultar combustible_maquinas:', err.message);
      return [];
    }
  },

  async addFuelLog(combustible) {
    if (!combustible) return { success: false, error: 'Datos de combustible requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: combustible.uuid || null,
        maquina_id: combustible.maquina_id ? Number(combustible.maquina_id) : null,
        maquina_uuid: combustible.maquina_uuid || null,
        fecha: combustible.fecha || new Date().toISOString().split('T')[0],
        litros: combustible.litros !== undefined ? Number(combustible.litros) : 0,
        precio_litro: combustible.precio_litro !== undefined ? Number(combustible.precio_litro) : 0,
        total: combustible.total !== undefined ? Number(combustible.total) : 0,
        observaciones: combustible.observaciones || ''
      };

      if (combustible.id) payload.id = Number(combustible.id);

      const onConflictColumn = combustible.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('combustible_maquinas')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseMachineService] Error al guardar combustible_maquinas:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al guardar combustible_maquinas:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteFuelLog(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de combustible requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('combustible_maquinas').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseMachineService] Error al eliminar combustible_maquinas ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseMachineService] Excepción al eliminar combustible_maquinas ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── MANTENIMIENTO MAQUINAS ─────────────────────────────────────────────────
  async getAllMaintenanceLogs() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('mantenimiento_maquinas')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseMachineService] Error al obtener mantenimiento_maquinas:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al consultar mantenimiento_maquinas:', err.message);
      return [];
    }
  },

  async addMaintenanceLog(mantenimiento) {
    if (!mantenimiento) return { success: false, error: 'Datos de mantenimiento requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        uuid: mantenimiento.uuid || null,
        maquina_id: mantenimiento.maquina_id ? Number(mantenimiento.maquina_id) : null,
        maquina_uuid: mantenimiento.maquina_uuid || null,
        fecha: mantenimiento.fecha || new Date().toISOString().split('T')[0],
        tipo: mantenimiento.tipo || '',
        descripcion: mantenimiento.descripcion || '',
        costo: mantenimiento.costo !== undefined ? Number(mantenimiento.costo) : 0,
        taller: mantenimiento.taller || '',
        estado: mantenimiento.estado || 'Realizado'
      };

      if (mantenimiento.id) payload.id = Number(mantenimiento.id);

      const onConflictColumn = mantenimiento.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('mantenimiento_maquinas')
        .upsert(payload, { onConflict: onConflictColumn });

      if (error) {
        console.error('[SupabaseMachineService] Error al guardar mantenimiento_maquinas:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[SupabaseMachineService] Excepción al guardar mantenimiento_maquinas:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteMaintenanceLog(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de mantenimiento requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('mantenimiento_maquinas').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseMachineService] Error al eliminar mantenimiento_maquinas ID/UUID ${uuid || id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseMachineService] Excepción al eliminar mantenimiento_maquinas ID/UUID ${uuid || id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseMachineService;
