export interface Employee {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  cargo?: string;
  fecha_ingreso?: string;
  salario?: number;
  estado?: 'Activo' | 'Inactivo' | string;
  observaciones?: string;
  horario_id?: number;
  created_at?: string;
}

export type EmployeeFormData = Omit<Employee, 'id' | 'created_at'> & { id?: number };
