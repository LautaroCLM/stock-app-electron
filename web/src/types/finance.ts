export type PeriodFilter = 'hoy' | 'semana' | 'mes' | 'año';

export interface TopProductMetric {
  nombre: string;
  cantidad: number;
}

export interface CategoryMetric {
  categoria: string;
  cantidad: number;
}

export interface LowStockProductItem {
  id: number;
  nombre: string;
  stock: number;
  unidad: string;
}

export interface FinanceMetrics {
  topProduct: TopProductMetric | null;
  bottomProduct: TopProductMetric | null;
  topCategory: CategoryMetric | null;
  productsEnteredCount: number | null; // null representa 'No disponible'
  productsDeletedCount: number | null; // null representa 'No disponible'
  productsSoldCount: number;
  currentTotalStock: number;
  lowStockProducts: LowStockProductItem[];
}

export interface DailySalesMetric {
  dia: string; // "01", "02", ..., "31"
  total: number;
}

export interface PaymentMethodMetric {
  metodo: string;
  total: number;
  porcentaje: number;
}

export interface FinancialTransaction {
  id: string | number;
  fecha: string;
  concepto: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  metodo_pago?: string;
}

export interface DesktopFinanceMetrics {
  totalPeriodSales: number;
  periodSalesCount: number;
  periodLabel: string;
  todaySales: number;
  todaySalesCount: number;
  monthSales: number;
  monthSalesCount: number;
  monthExpenses: number;
  monthPayrollExpenses: number;
  monthNetBalance: number;
  selectedYearMonth: string; // "YYYY-MM"
  salesByDay: DailySalesMetric[];
  paymentMethods: PaymentMethodMetric[];
  recentTransactions: FinancialTransaction[];

  // Contrato financiero unificado P&L + Flujo de Caja
  ventasDevengadas?: number;
  municipioDevengado?: number;
  atmosDevengado?: number;
  totalIngresosDevengados?: number;
  gastosDevengados?: number;
  comprasDevengadas?: number;
  sueldosDevengados?: number;
  totalEgresosDevengados?: number;
  resultadoOperativo?: number;
  flujoCajaReal?: number;
}
