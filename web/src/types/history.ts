import { PeriodFilter } from './finance';

export type HistoryDocumentType = 'ventas' | 'presupuestos' | 'remitos';

export interface HistoryItemDetail {
  id?: number;
  producto_id?: number | null;
  codigo?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  total: number;
  unidad?: string;
  observaciones?: string;
}

export interface GroupedSaleRecord {
  id: string | number; // e.g. "V-1042" o ID de la primera fila
  fecha: string;
  cliente: string;
  metodo_pago: string;
  total: number;
  subtotal?: number;
  descuento?: number;
  recargo?: number;
  items: HistoryItemDetail[];
  itemsCount: number;
  resumenProductos: string;
}

export interface PresupuestoHistoryRecord {
  id: number;
  numeroFormatted: string; // e.g. "P-0089"
  fecha: string;
  cliente: string;
  cuit?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  observaciones?: string;
  estado?: string;
  productos: HistoryItemDetail[];
  resumenProductos: string;
}

export interface RemitoHistoryRecord {
  id: number;
  numeroFormatted: string; // e.g. "R-0045"
  fecha: string;
  cliente: string;
  cuit?: string;
  telefono?: string;
  direccion?: string;
  localidad?: string;
  metodo_pago?: string;
  vendedor?: string;
  transporte?: string;
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  observaciones?: string;
  productos: HistoryItemDetail[];
  resumenProductos: string;
}

export interface HistoryFilterParams {
  period: PeriodFilter;
  customDate?: string;
  searchQuery?: string;
  paymentMethod?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedHistoryResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  totalPages: number;
}
