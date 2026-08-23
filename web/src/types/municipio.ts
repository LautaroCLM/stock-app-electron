export interface MunicipioOrderItem {
  id?: number;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface MunicipioOrder {
  id: number;
  fecha: string;
  expediente?: string;
  orden_compra?: string;
  fecha_estimada_cobro?: string;
  observaciones?: string;
  total: number;
  saldo_pendiente?: number;
  estado?: 'Pendiente' | 'Pago parcial' | 'Cobrado' | string;
  productos?: MunicipioOrderItem[] | string;
  created_at?: string;
}

export type MunicipioOrderFormData = Omit<MunicipioOrder, 'id' | 'created_at'> & { id?: number };

export interface MunicipioPayment {
  id: number;
  orden_id: number;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  observaciones?: string | null;
  created_at?: string;
}

export interface MunicipioPaymentFormData {
  id?: number;
  orden_id: number;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  observaciones?: string;
}

