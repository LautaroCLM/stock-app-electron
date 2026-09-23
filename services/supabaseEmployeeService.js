// services/supabaseEmployeeService.js
//
// Servicio de Lectura/Escritura del Módulo Empleados y Liquidaciones en Supabase.
// Encapsula las operaciones contra las tablas 'empleados', 'asistencias',
// 'empleado_liquidacion_config' y 'empleado_liquidaciones'.
// Fase 1B.1 — Desacoplamiento estricto de FKs físicas (empleado_id) a favor de UUIDs.

'use strict';

const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseClient');

const supabaseEmployeeService = {
  // ── EMPLEADOS ──────────────────────────────────────────────────────────────
  async getAllEmployees() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('empleados')
        .select('*')
        .order('apellido', { ascending: true });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al obtener empleados:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al consultar empleados:', err.message);
      return [];
    }
  },

  async addEmployee(emp) {
    if (!emp) return { success: false, error: 'Datos de empleado requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        nombre: emp.nombre || '',
        apellido: emp.apellido || '',
        dni: emp.dni || '',
        telefono: emp.telefono || '',
        email: emp.email || '',
        direccion: emp.direccion || '',
        fecha_nacimiento: emp.fecha_nacimiento || null,
        cargo: emp.cargo || '',
        fecha_ingreso: emp.fecha_ingreso || null,
        estado: emp.estado || 'Activo',
        observaciones: emp.observaciones || ''
      };

      if (emp.uuid) payload.uuid = emp.uuid;

      const conflictTarget = emp.uuid ? 'uuid' : 'id';

      const { data, error } = await client
        .from('empleados')
        .upsert(payload, { onConflict: conflictTarget })
        .select('id, uuid');

      if (error) {
        console.error('[SupabaseEmployeeService] Error al guardar empleado:', error.message);
        return { success: false, error: error.message };
      }

      const remoteRecord = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const remoteId = remoteRecord ? remoteRecord.id : null;
      const remoteUuid = remoteRecord ? remoteRecord.uuid : payload.uuid;

      console.log(`[SupabaseEmployeeService] Empleado guardado en Supabase -> Remote ID: ${remoteId}, UUID: ${remoteUuid}`);
      return { success: true, id: remoteId, uuid: remoteUuid };
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al guardar empleado:', err.message);
      return { success: false, error: err.message };
    }
  },

  async updateEmployee(emp) {
    return this.addEmployee(emp);
  },

  async deleteEmployee(identifier) {
    if (!identifier) return { success: false, error: 'ID o UUID de empleado requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('empleados').delete();
      if (typeof identifier === 'string' && identifier.includes('-')) {
        query = query.eq('uuid', identifier);
      } else {
        query = query.eq('id', Number(identifier));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseEmployeeService] Error al eliminar empleado (${identifier}):`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseEmployeeService] Empleado (${identifier}) eliminado en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseEmployeeService] Excepción al eliminar empleado (${identifier}):`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── ASISTENCIAS ────────────────────────────────────────────────────────────
  async getAllAttendances() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('asistencias')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al obtener asistencias:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al consultar asistencias:', err.message);
      return [];
    }
  },

  async addAttendance(att) {
    if (!att) return { success: false, error: 'Datos de asistencia requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let remoteEmpleadoId = null;

      // REGLA CRITICA: Resolver empleado_id remoto exclusivamente mediante empleado_uuid
      if (att.empleado_uuid) {
        const { data: empData, error: empErr } = await client
          .from('empleados')
          .select('id, uuid')
          .eq('uuid', att.empleado_uuid)
          .maybeSingle();

        if (empErr) {
          console.error(`[SupabaseEmployeeService] Error buscando empleado remoto por UUID ${att.empleado_uuid}:`, empErr.message);
          return { success: false, error: `Error resolviendo empleado por UUID: ${empErr.message}` };
        }

        if (!empData || !empData.id) {
          console.warn(`[SupabaseEmployeeService] Empleado remoto no encontrado para UUID ${att.empleado_uuid}. Deteniendo inserción de asistencia.`);
          return { success: false, error: `Empleado remoto no existe para UUID ${att.empleado_uuid}.` };
        }

        remoteEmpleadoId = empData.id;
      } else if (att.empleado_id) {
        // Fallback únicamente si att no contenía UUID pero contenía empleado_id
        remoteEmpleadoId = Number(att.empleado_id);
      }

      if (!remoteEmpleadoId) {
        return { success: false, error: 'No se pudo resolver la clave foránea remota (empleado_id) para la asistencia.' };
      }

      const payload = {
        empleado_id: remoteEmpleadoId,
        fecha: att.fecha || new Date().toISOString().split('T')[0],
        hora_entrada: att.hora_entrada || null,
        hora_salida: att.hora_salida || null,
        estado: att.estado || 'Presente',
        observaciones: att.observaciones || ''
      };

      if (att.uuid) payload.uuid = att.uuid;
      if (att.empleado_uuid) payload.empleado_uuid = att.empleado_uuid;

      const conflictTarget = att.uuid ? 'uuid' : 'id';

      const { data, error } = await client
        .from('asistencias')
        .upsert(payload, { onConflict: conflictTarget })
        .select('id, uuid');

      if (error) {
        console.error('[SupabaseEmployeeService] Error al guardar asistencia:', error.message);
        return { success: false, error: error.message };
      }

      const remoteRecord = Array.isArray(data) && data.length > 0 ? data[0] : null;
      console.log(`[SupabaseEmployeeService] Asistencia guardada en Supabase -> Remote ID: ${remoteRecord?.id || 'N/A'}, Remote empleado_id: ${remoteEmpleadoId}`);

      return { success: true, id: remoteRecord?.id, uuid: remoteRecord?.uuid || payload.uuid };
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al guardar asistencia:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteAttendance(identifier) {
    if (!identifier) return { success: false, error: 'ID o UUID de asistencia requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('asistencias').delete();
      if (typeof identifier === 'string' && identifier.includes('-')) {
        query = query.eq('uuid', identifier);
      } else {
        query = query.eq('id', Number(identifier));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseEmployeeService] Error al eliminar asistencia (${identifier}):`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseEmployeeService] Excepción al eliminar asistencia (${identifier}):`, err.message);
      return { success: false, error: err.message };
    }
  },

  // ── CONFIGURACION LIQUIDACION ──────────────────────────────────────────────
  async getAllPayrollConfigs() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('empleado_liquidacion_config')
        .select('*');

      if (error) {
        console.error('[SupabaseEmployeeService] Error al obtener configs de liquidación:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al consultar configs de liquidación:', err.message);
      return [];
    }
  },

  async addPayrollConfig(config) {
    if (!config) return { success: false, error: 'Datos de configuración requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        empleado_id: Number(config.empleado_id),
        valor_hora: config.valor_hora !== undefined ? Number(config.valor_hora) : 0,
        costo_mensual: config.costo_mensual !== undefined ? Number(config.costo_mensual) : 0,
        estado: config.estado || 'Activo'
      };
      if (config.empleado_uuid) payload.empleado_uuid = config.empleado_uuid;

      const onConflictTarget = config.empleado_uuid ? 'empleado_uuid' : 'empleado_id';
      const { error } = await client
        .from('empleado_liquidacion_config')
        .upsert(payload, { onConflict: onConflictTarget });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al guardar config de liquidación:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al guardar config de liquidación:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ── LIQUIDACIONES ──────────────────────────────────────────────────────────
  async getAllPayrolls() {
    if (!isSupabaseConfigured()) return [];
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('empleado_liquidaciones')
        .select('*')
        .order('mes', { ascending: false });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al obtener liquidaciones:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al consultar liquidaciones:', err.message);
      return [];
    }
  },

  async addPayroll(liq) {
    if (!liq) return { success: false, error: 'Datos de liquidación requeridos.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const payload = {
        empleado_id: Number(liq.empleado_id),
        mes: liq.mes,
        horas_trabajadas: liq.horas_trabajadas !== undefined ? Number(liq.horas_trabajadas) : 0,
        valor_hora: liq.valor_hora !== undefined ? Number(liq.valor_hora) : 0,
        adicionales: liq.adicionales !== undefined ? Number(liq.adicionales) : 0,
        descuentos: liq.descuentos !== undefined ? Number(liq.descuentos) : 0,
        total_generado: liq.total_generado !== undefined ? Number(liq.total_generado) : 0,
        total_liquidacion: liq.total_liquidacion !== undefined ? Number(liq.total_liquidacion) : 0
      };

      if (liq.id) payload.id = Number(liq.id);
      if (liq.uuid) payload.uuid = liq.uuid;
      if (liq.empleado_uuid) payload.empleado_uuid = liq.empleado_uuid;

      const onConflictTarget = liq.uuid ? 'uuid' : 'id';
      const { error } = await client
        .from('empleado_liquidaciones')
        .upsert(payload, { onConflict: onConflictTarget });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al guardar liquidación:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al guardar liquidación:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deletePayroll(id, uuid = null) {
    if (!id && !uuid) return { success: false, error: 'ID o UUID de liquidación requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      let query = client.from('empleado_liquidaciones').delete();
      if (uuid) {
        query = query.eq('uuid', uuid);
      } else {
        query = query.eq('id', Number(id));
      }

      const { error } = await query;

      if (error) {
        console.error(`[SupabaseEmployeeService] Error al eliminar liquidación (UUID: ${uuid}, ID: ${id}):`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseEmployeeService] Excepción al eliminar liquidación (UUID: ${uuid}, ID: ${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseEmployeeService;
