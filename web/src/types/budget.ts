export interface BudgetItem {
  id?: number;
  nombre: string;
  cantidad: number;
  precio: number;
  unidad?: string;
}

export interface Budget {
  id: number;
  fecha: string;
  cliente?: string;
  cuit?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  subtotal: number;
  descuento?: number;
  recargo?: number;
  total: number;
  observaciones?: string;
  estado?: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Vencido' | string;
  productos?: BudgetItem[] | string;
  created_at?: string;
}

export type BudgetFormData = Omit<Budget, 'id' | 'created_at' | 'fecha'> & { id?: number; fecha?: string };
