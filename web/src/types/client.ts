export interface Client {
  id: number;
  uuid?: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  cuit?: string;
  observaciones?: string;
  estado?: 'Activo' | 'Inactivo' | string;
  created_at?: string;
}

export type ClientFormData = Omit<Client, 'id' | 'created_at'> & { id?: number; uuid?: string };

export interface ClientSaleItem {
  id?: number;
  codigo?: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface ClientSale {
  id: number;
  cliente_id: number;
  cliente_nombre?: string;
  fecha: string;
  fecha_estimada_cobro?: string;
  comprobante?: string;
  observaciones?: string;
  total: number;
  saldo_pendiente: number;
  estado: 'Pendiente' | 'Pago parcial' | 'Cobrado' | string;
  productos: ClientSaleItem[] | string;
  created_at?: string;
}

export type ClientSaleFormData = {
  id?: number;
  cliente_id: number;
  fecha: string;
  fecha_estimada_cobro?: string;
  comprobante?: string;
  observaciones?: string;
  productos: ClientSaleItem[];
  total: number;
};

export interface ClientPayment {
  id: number;
  cliente_id: number;
  venta_id?: number;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  comprobante?: string;
  observaciones?: string;
  created_at?: string;
}

export interface ClientPaymentFormData {
  id?: number;
  cliente_id: number;
  venta_id: number;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  comprobante?: string;
  observaciones?: string;
}

export interface ClientAccountMovement {
  id: number;
  cliente_id: number;
  fecha: string;
  tipo: 'Venta' | 'Pago' | string;
  descripcion?: string;
  debito: number;
  credito: number;
  referencia_id?: number;
  created_at?: string;
}

export interface ClientTopDebtor {
  id: number;
  nombre: string;
  telefono?: string;
  deuda: number;
}

export interface ClientStats {
  totalVendido: number;
  totalCobrado: number;
  totalPendiente: number;
  cantVentas: number;
  cantPendientes: number;
  cantCobradas: number;
  topDeudores: ClientTopDebtor[];
}
