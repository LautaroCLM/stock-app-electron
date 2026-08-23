import { supabase } from '../supabase/client';
import { Attendance, AttendanceFormData } from '@/types/payroll';

export const calcAttHoras = (entrada?: string | null, salida?: string | null): number => {
  if (!entrada || !salida) return 0;
  const parts1 = String(entrada).split(':').map(Number);
  const parts2 = String(salida).split(':').map(Number);
  if (parts1.length < 2 || parts2.length < 2 || isNaN(parts1[0]) || isNaN(parts1[1]) || isNaN(parts2[0]) || isNaN(parts2[1])) {
    return 0;
  }
  let mins = (parts2[0] * 60 + parts2[1]) - (parts1[0] * 60 + parts1[1]);
  if (mins < 0) {
    mins += 24 * 60; // Cruce de medianoche
  }
  return Number((mins / 60).toFixed(2));
};

export const attendanceWebService = {
  async getAttendances(empleadoId?: number, fechaInicio?: string, fechaFin?: string): Promise<Attendance[]> {
    let query = supabase
      .from('asistencias')
      .select('*, empleados(nombre, apellido)')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (empleadoId) {
      query = query.eq('empleado_id', empleadoId);
    }
    if (fechaInicio) {
      query = query.gte('fecha', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha', fechaFin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[attendanceWebService] Error al obtener asistencias:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }

    return (data || []).map((a: any) => ({
      ...a,
      empleado_nombre: a.empleados ? `${a.empleados.apellido}, ${a.empleados.nombre}` : `Empleado #${a.empleado_id}`,
    }));
  },

  async createAttendance(attData: AttendanceFormData): Promise<Attendance> {
    if (!attData.empleado_id) {
      throw new Error('Debes seleccionar un empleado.');
    }
    if (!attData.fecha) {
      throw new Error('La fecha de asistencia es obligatoria.');
    }

    const payload: Partial<Attendance> = {
      empleado_id: Number(attData.empleado_id),
      fecha: attData.fecha,
      hora_entrada: attData.hora_entrada?.trim() || null,
      hora_salida: attData.hora_salida?.trim() || null,
      estado: attData.estado || 'Presente',
      observaciones: attData.observaciones?.trim() || '',
    };

    if (attData.id) {
      payload.id = Number(attData.id);
    }

    const { data, error } = await supabase
      .from('asistencias')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[attendanceWebService] Error al registrar asistencia:', error.message);
      throw new Error(`Error en Supabase al guardar asistencia: ${error.message}`);
    }
    return data;
  },

  async updateAttendance(id: number, attData: Partial<AttendanceFormData>): Promise<Attendance> {
    const payload: Partial<Attendance> = {
      empleado_id: attData.empleado_id ? Number(attData.empleado_id) : undefined,
      fecha: attData.fecha,
      hora_entrada: attData.hora_entrada?.trim() || null,
      hora_salida: attData.hora_salida?.trim() || null,
      estado: attData.estado,
      observaciones: attData.observaciones?.trim(),
    };

    const { data, error } = await supabase
      .from('asistencias')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[attendanceWebService] Error al actualizar asistencia ID ${id}:`, error.message);
      throw new Error(`Error al actualizar asistencia: ${error.message}`);
    }
    return data;
  },

  async deleteAttendance(id: number): Promise<void> {
    const { error } = await supabase
      .from('asistencias')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[attendanceWebService] Error al eliminar asistencia ID ${id}:`, error.message);
      throw new Error(`Error al eliminar asistencia: ${error.message}`);
    }
  }
};

