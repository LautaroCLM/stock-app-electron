export interface Product {
  id: number;
  uuid?: string;
  codigo?: string;
  nombre: string;
  categoria?: string;
  stock: number;
  unidad?: string;
  precio_costo?: number;
  precio: number;
  stock_minimo?: number;
  proveedor_id?: number | null;
  created_at?: string;
}

export type ProductFormData = Omit<Product, 'id' | 'created_at'> & { id?: number; uuid?: string };
