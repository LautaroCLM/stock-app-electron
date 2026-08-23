export interface Machine {
  id: number;
  nombre: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  numero_serie?: string;
  valor_hora?: number;
  horas_totales?: number;
  ultimo_servicio?: string | null;
  estado?: 'Disponible' | 'En uso' | 'En Mantenimiento' | 'Fuera de servicio' | string;
  observaciones?: string;
  created_at?: string;
}

export type MachineFormData = Omit<Machine, 'id' | 'created_at'> & { id?: number };

export interface MachineWorkLog {
  id: number;
  maquina_id: number;
  maquina_nombre?: string;
  fecha: string;
  cliente?: string;
  operador?: string;
  horas: number;
  precio_hora: number;
  total: number;
  observaciones?: string;
  created_at?: string;
}

export interface MachineWorkLogFormData {
  id?: number;
  maquina_id: number;
  fecha: string;
  cliente?: string;
  operador?: string;
  horas: number;
  precio_hora: number;
  total?: number;
  observaciones?: string;
}

export interface MachineFuelLog {
  id: number;
  maquina_id: number;
  maquina_nombre?: string;
  fecha: string;
  litros: number;
  precio_litro: number;
  total: number;
  observaciones?: string;
  created_at?: string;
}

export interface MachineFuelLogFormData {
  id?: number;
  maquina_id: number;
  fecha: string;
  litros: number;
  precio_litro: number;
  total?: number;
  observaciones?: string;
}

export interface MachineMaintenanceLog {
  id: number;
  maquina_id: number;
  maquina_nombre?: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  costo: number;
  taller?: string;
  estado: string;
  created_at?: string;
}

export interface MachineMaintenanceLogFormData {
  id?: number;
  maquina_id: number;
  fecha: string;
  tipo: string;
  descripcion: string;
  costo: number;
  taller?: string;
  estado?: string;
}

export interface MachineProfitability {
  id: number;
  nombre: string;
  tipo?: string;
  horas_totales: number;
  ingresos: number;
  gasto_combustible: number;
  gasto_mantenimiento: number;
  rentabilidad_neta: number;
}

export interface MachineStats {
  totalMaquinas: number;
  disponibles: number;
  enUso: number;
  enMantenimiento: number;
  horasMes: number;
  ingresosMes: number;
  gastoComb: number;
  gastoMant: number;
}

