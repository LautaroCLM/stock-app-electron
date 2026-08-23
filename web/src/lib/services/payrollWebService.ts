import { supabase } from '../supabase/client';
import { PayrollRecord, PayrollFormData, EmployeePayrollSummary } from '@/types/payroll';
import { calcAttHoras } from './attendanceWebService';

export const payrollWebService = {
  async getPayrolls(): Promise<PayrollRecord[]> {
    const { data, error } = await supabase
      .from('empleado_liquidaciones')
      .select('*, empleados(nombre, apellido)')
      .order('mes', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[payrollWebService] Error al obtener liquidaciones:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }

    return (data || []).map((p: any) => ({
      ...p,
      empleado_nombre: p.empleados ? `${p.empleados.apellido}, ${p.empleados.nombre}` : `Empleado #${p.empleado_id}`,
    }));
  },

  async getEmployeeMonthSummary(empleadoId: number, mes: string): Promise<EmployeePayrollSummary> {
    if (!empleadoId || !mes) throw new Error('Empleado y mes son obligatorios.');

    // Construir rango ISO de fechas para el mes (compatible con TIMESTAMPTZ)
    const [yearStr, monthStr] = mes.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const startISO = `${mes}-01T00:00:00.000Z`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthStr = String(nextMonth).padStart(2, '0');
    const endISO = `${nextYear}-${nextMonthStr}-01T00:00:00.000Z`;

    // Obtener empleado y su configuración salarial
    const [empRes, confRes, attRes, liqRes] = await Promise.all([
      supabase.from('empleados').select('*').eq('id', empleadoId).single(),
      supabase.from('empleado_liquidacion_config').select('*').eq('empleado_id', empleadoId).maybeSingle(),
      supabase
        .from('asistencias')
        .select('*')
        .eq('empleado_id', empleadoId)
        .gte('fecha', startISO)
        .lt('fecha', endISO),
      supabase.from('empleado_liquidaciones').select('*').eq('empleado_id', empleadoId).eq('mes', mes).maybeSingle(),
    ]);

    if (empRes.error) throw new Error(`Error al obtener empleado: ${empRes.error.message}`);

    const emp = empRes.data;
    const config = confRes.data;
    const asistencias = (attRes.data || []).filter(a => a.estado === 'Presente' || a.estado === 'Tarde');

    let totalHoras = 0;
    for (const att of asistencias) {
      totalHoras += calcAttHoras(att.hora_entrada, att.hora_salida);
    }

    const valorHora = Number(config?.valor_hora || 0);
    const costoMensual = Number(config?.costo_mensual || 0);

    return {
      empleado_id: emp.id,
      nombre: emp.nombre,
      apellido: emp.apellido,
      dni: emp.dni,
      cargo: emp.cargo,
      valor_hora: valorHora,
      costo_mensual: costoMensual,
      mes,
      horas_trabajadas: Number(totalHoras.toFixed(2)),
      dias_trabajados: asistencias.length,
      liquidacion: liqRes.data || null,
    };
  },

  async createPayroll(payrollData: PayrollFormData): Promise<PayrollRecord> {
    if (!payrollData.empleado_id) {
      throw new Error('Debes seleccionar un empleado.');
    }
    if (!payrollData.mes) {
      throw new Error('El período (Mes) de liquidación es obligatorio.');
    }

    const horas = Number(payrollData.horas_trabajadas || 0);
    const vHora = Number(payrollData.valor_hora || 0);
    const adic = Number(payrollData.adicionales || 0);
    const desc = Number(payrollData.descuentos || 0);
    const totGenerado = (horas * vHora) + adic;
    const totLiq = Math.max(0, totGenerado - desc);

    const payload: Partial<PayrollRecord> = {
      empleado_id: Number(payrollData.empleado_id),
      mes: payrollData.mes,
      horas_trabajadas: horas,
      valor_hora: vHora,
      adicionales: adic,
      descuentos: desc,
      total_generado: payrollData.total_generado ?? totGenerado,
      total_liquidacion: payrollData.total_liquidacion ?? totLiq,
    };

    if (payrollData.id) {
      payload.id = Number(payrollData.id);
    }

    const { data, error } = await supabase
      .from('empleado_liquidaciones')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[payrollWebService] Error al guardar liquidación:', error.message);
      throw new Error(`Error en Supabase al liquidar: ${error.message}`);
    }
    return data;
  },

  async updatePayroll(id: number, payrollData: Partial<PayrollFormData>): Promise<PayrollRecord> {
    const horas = payrollData.horas_trabajadas !== undefined ? Number(payrollData.horas_trabajadas) : undefined;
    const vHora = payrollData.valor_hora !== undefined ? Number(payrollData.valor_hora) : undefined;
    const adic = payrollData.adicionales !== undefined ? Number(payrollData.adicionales) : undefined;
    const desc = payrollData.descuentos !== undefined ? Number(payrollData.descuentos) : undefined;

    const payload: Partial<PayrollRecord> = {
      empleado_id: payrollData.empleado_id ? Number(payrollData.empleado_id) : undefined,
      mes: payrollData.mes,
      horas_trabajadas: horas,
      valor_hora: vHora,
      adicionales: adic,
      descuentos: desc,
      total_generado: payrollData.total_generado,
      total_liquidacion: payrollData.total_liquidacion,
    };

    const { data, error } = await supabase
      .from('empleado_liquidaciones')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[payrollWebService] Error al actualizar liquidación ID ${id}:`, error.message);
      throw new Error(`Error al actualizar liquidación: ${error.message}`);
    }
    return data;
  },

  async deletePayroll(id: number): Promise<void> {
    const { error } = await supabase
      .from('empleado_liquidaciones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[payrollWebService] Error al eliminar liquidación ID ${id}:`, error.message);
      throw new Error(`Error al eliminar liquidación: ${error.message}`);
    }
  },
};

