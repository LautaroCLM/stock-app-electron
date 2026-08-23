export interface AtmosfericoService {
  id: number;
  fecha: string;
  cliente: string;
  direccion: string;
  telefono?: string;
  tipo_servicio: string;
  descripcion?: string;
  monto: number;
  saldo_pendiente?: number;
  estado?: 'Pendiente' | 'Pago parcial' | 'Cobrado' | string;
  observaciones?: string;
  fecha_estimada_cobro?: string;
  created_at?: string;
}

export type AtmosfericoServiceFormData = Omit<AtmosfericoService, 'id' | 'created_at'> & { id?: number };

export interface AtmosfericoPago {
  id: number;
  orden_id: number;
  fecha: string;
  monto: number;
  metodo_pago: string;
  observaciones?: string | null;
  created_at?: string;
}

export interface AtmosfericoPagoFormData {
  id?: number;
  orden_id: number;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  observaciones?: string;
}

export interface AtmosfericoStats {
  totalVendido: number;
  totalPendiente: number;
  totalCobrado: number;
  cantOrdenes: number;
  cantPendientes: number;
  cantCobradas: number;
}

export interface UpcomingCollection {
  id: number;
  fecha: string;
  cliente: string;
  direccion: string;
  monto: number;
  saldo_pendiente: number;
  fecha_estimada_cobro?: string;
  estado?: string;
}

