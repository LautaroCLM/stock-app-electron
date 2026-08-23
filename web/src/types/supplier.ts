export interface Supplier {
  id: number;
  razon_social: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  cuit?: string;
  observaciones?: string;
  estado?: 'Activo' | 'Inactivo' | string;
  created_at?: string;
  deuda_actual?: number;
  ultima_compra?: string | null;
}

export type SupplierFormData = Omit<Supplier, 'id' | 'created_at' | 'deuda_actual' | 'ultima_compra'> & { id?: number };

export interface Purchase {
  id: number;
  proveedor_id: number;
  fecha: string;
  descripcion?: string | null;
  total: number;
  metodo_pago?: string;
  estado?: 'Pendiente' | 'Parcial' | 'Pagado' | string;
  observaciones?: string | null;
  created_at?: string;
  proveedor_nombre?: string;
}

export interface PurchaseFormData {
  id?: number;
  proveedor_id: number;
  fecha: string;
  descripcion?: string;
  total: number;
  metodo_pago?: string;
  fecha_vencimiento?: string;
  observaciones?: string;
}

export interface Payment {
  id: number;
  proveedor_id: number;
  compra_id?: number | null;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  comprobante?: string | null;
  observaciones?: string | null;
  created_at?: string;
  proveedor_nombre?: string;
}

export interface PaymentFormData {
  id?: number;
  proveedor_id: number;
  compra_id?: number | null;
  fecha: string;
  monto: number;
  metodo_pago?: string;
  comprobante?: string;
  observaciones?: string;
}

export interface AccountMovement {
  id: number;
  proveedor_id: number;
  fecha: string;
  tipo: 'Compra' | 'Pago' | 'Ajuste' | string;
  descripcion?: string | null;
  debito: number;
  credito: number;
  referencia_id?: number | null;
  fecha_vencimiento?: string | null;
  estado_pago?: 'Pendiente' | 'Parcial' | 'Pagado' | string;
  created_at?: string;
  saldo_acumulado?: number;
}

export interface UpcomingDueDate extends AccountMovement {
  proveedor_nombre?: string;
  saldo_pendiente: number;
}

export interface SupplierStats {
  totalProveedores: number;
  totalDeuda: number;
  deudasVencidas: number;
  comprasMes: number;
  pagosMes: number;
  topProveedor?: { razon_social: string; total: number } | null;
  comprasPorMes?: Array<{ mes: string; total: number }>;
}

