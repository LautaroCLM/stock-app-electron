export interface Expense {
  id: number;
  fecha: string;
  concepto: string;
  categoria?: string;
  monto: number;
  observacion?: string;
  estado?: 'Pagado' | 'Pendiente' | string;
  created_at?: string;
}

export type ExpenseFormData = Omit<Expense, 'id' | 'created_at'> & { id?: number };

export interface CategoryExpenseSummary {
  categoria: string;
  total: number;
  cantidad: number;
  porcentaje: number;
}

export interface ExpenseStats {
  totalHistorico: number;
  gastoMesActual: number;
  gastoPendiente: number;
  totalRegistros: number;
  porCategoria: CategoryExpenseSummary[];
}

