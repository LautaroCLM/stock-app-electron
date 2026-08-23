export interface RemitoItem {
  id?: number;
  nombre: string;
  cantidad: number;
  precio: number;
  unidad?: string;
}

export interface Remito {
  id: number;
  fecha: string;
  cliente?: string;
  cuit?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  metodo_pago?: string;
  subtotal: number;
  descuento?: number;
  recargo?: number;
  total: number;
  observaciones?: string;
  productos?: RemitoItem[] | string;
  created_at?: string;
}

export type RemitoFormData = Omit<Remito, 'id' | 'created_at'> & { id?: number };
