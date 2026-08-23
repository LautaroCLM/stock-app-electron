export interface Sale {
  id: number;
  producto_id?: number | null;
  cantidad: number;
  total: number;
  cliente?: string;
  metodo_pago?: string;
  fecha: string;
  producto_nombre?: string;
  created_at?: string;
}

export type SaleFormData = Omit<Sale, 'id' | 'created_at'> & { id?: number };
