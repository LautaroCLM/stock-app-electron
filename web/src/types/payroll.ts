export interface Attendance {
  id: number;
  empleado_id: number;
  fecha: string;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  estado?: 'Presente' | 'Ausente' | 'Tarde' | 'Licencia' | string;
  observaciones?: string | null;
  empleado_nombre?: string;
  created_at?: string;
}

export type AttendanceFormData = Omit<Attendance, 'id' | 'created_at'> & { id?: number };

export interface PayrollConfig {
  empleado_id: number;
  valor_hora: number;
  costo_mensual?: number;
  estado?: string;
}

export interface PayrollRecord {
  id: number;
  empleado_id: number;
  mes: string; // YYYY-MM
  horas_trabajadas: number;
  valor_hora: number;
  adicionales: number;
  descuentos: number;
  total_generado: number;
  total_liquidacion: number;
  empleado_nombre?: string;
  created_at?: string;
}

export type PayrollFormData = Omit<PayrollRecord, 'id' | 'created_at'> & { id?: number };

export interface EmployeePayrollSummary {
  empleado_id: number;
  nombre: string;
  apellido: string;
  dni: string;
  cargo?: string;
  valor_hora: number;
  costo_mensual: number;
  mes: string;
  horas_trabajadas: number;
  dias_trabajados: number;
  liquidacion?: PayrollRecord | null;
}

