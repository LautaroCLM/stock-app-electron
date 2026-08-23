// services/supabaseEmployeeService.js
//
// Servicio de Lectura/Escritura del Módulo Empleados y Liquidaciones en Supabase.
// Encapsula las operaciones contra las tablas 'empleados', 'asistencias',
// 'empleado_liquidacion_config' y 'empleado_liquidaciones'.

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

      if (emp.id) payload.id = Number(emp.id);

      const { error } = await client
        .from('empleados')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al guardar empleado:', error.message);
        return { success: false, error: error.message };
      }

      console.log('[SupabaseEmployeeService] Empleado guardado en Supabase ID:', payload.id || 'N/A');
      return { success: true };
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al guardar empleado:', err.message);
      return { success: false, error: err.message };
    }
  },

  async updateEmployee(emp) {
    return this.addEmployee(emp);
  },

  async deleteEmployee(id) {
    if (!id) return { success: false, error: 'ID de empleado requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('empleados')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseEmployeeService] Error al eliminar empleado ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`[SupabaseEmployeeService] Empleado ID ${id} eliminado en Supabase.`);
      return { success: true };
    } catch (err) {
      console.error(`[SupabaseEmployeeService] Excepción al eliminar empleado ID ${id}:`, err.message);
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
      const payload = {
        empleado_id: Number(att.empleado_id),
        fecha: att.fecha || new Date().toISOString().split('T')[0],
        hora_entrada: att.hora_entrada || null,
        hora_salida: att.hora_salida || null,
        estado: att.estado || 'Presente',
        observaciones: att.observaciones || ''
      };

      if (att.id) payload.id = Number(att.id);

      const { error } = await client
        .from('asistencias')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[SupabaseEmployeeService] Error al guardar asistencia:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[SupabaseEmployeeService] Excepción al guardar asistencia:', err.message);
      return { success: false, error: err.message };
    }
  },

  async deleteAttendance(id) {
    if (!id) return { success: false, error: 'ID de asistencia requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('asistencias')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseEmployeeService] Error al eliminar asistencia ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseEmployeeService] Excepción al eliminar asistencia ID ${id}:`, err.message);
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

      const { error } = await client
        .from('empleado_liquidacion_config')
        .upsert(payload, { onConflict: 'empleado_id' });

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

      const { error } = await client
        .from('empleado_liquidaciones')
        .upsert(payload, { onConflict: 'id' });

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

  async deletePayroll(id) {
    if (!id) return { success: false, error: 'ID de liquidación requerido.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };

    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Cliente Supabase no disponible' };

    try {
      const { error } = await client
        .from('empleado_liquidaciones')
        .delete()
        .eq('id', Number(id));

      if (error) {
        console.error(`[SupabaseEmployeeService] Error al eliminar liquidación ID ${id}:`, error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error(`[SupabaseEmployeeService] Excepción al eliminar liquidación ID ${id}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = supabaseEmployeeService;
