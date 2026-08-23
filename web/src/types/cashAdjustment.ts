export interface CashAdjustment {
  id: number;
  fecha: string;
  tipo: 'Venta anulada' | 'Error de carga' | 'Retiro de efectivo' | 'Ingreso manual' | 'Diferencia de caja' | 'Otro' | string;
  motivo: string;
  monto: number;
  observacion?: string | null;
  venta_id?: number | null;
  created_at?: string;
  ventas?: {
    id: number;
    total?: number;
    cliente?: string;
  } | null;
}

export type CashAdjustmentFormData = Omit<CashAdjustment, 'id' | 'created_at' | 'ventas'> & {
  id?: number;
  efecto?: 'Ingreso' | 'Egreso';
};

export interface CashAdjustmentSummary {
  positivos: number;
  negativos: number;
  balance: number;
  cantidad: number;
}
