import { PeriodFilter } from './finance';

export interface TopProductReportItem {
  id?: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export interface CategoryReportItem {
  categoria: string;
  cantidad: number;
  total: number;
  porcentaje: number;
}

export interface PaymentMethodReportItem {
  metodo: string;
  total: number;
  cantidad: number;
  porcentaje: number;
}

export interface LowStockReportItem {
  id: number;
  nombre: string;
  stock: number;
  unidad: string;
  stock_minimo: number;
}

export interface DetailedSaleReportItem {
  id: number;
  fecha: string;
  producto_id: number | null;
  producto_nombre: string;
  cantidad: number;
  total: number;
  metodo_pago: string;
  cliente: string;
}

export interface FullReportMetrics {
  period: PeriodFilter;
  customDate?: string;
  periodLabel: string;
  totalRevenue: number;
  totalSalesCount: number;
  totalUnitsSoldCount: number;
  averageTicket: number;
  
  // KPIs
  topProduct: TopProductReportItem | null;
  bottomProduct: TopProductReportItem | null;
  topCategory: CategoryReportItem | null;

  // Summary Cards
  productsEnteredCount: number;
  productsDeletedCount: number;
  currentTotalStock: number;

  // Breakdown & Charts
  categoryBreakdown: CategoryReportItem[];
  paymentMethodBreakdown: PaymentMethodReportItem[];

  // Tables
  mostSoldProducts: TopProductReportItem[];
  leastSoldProducts: TopProductReportItem[];
  lowStockProducts: LowStockReportItem[];

  // Detailed Sales History
  detailedSales: DetailedSaleReportItem[];
}
