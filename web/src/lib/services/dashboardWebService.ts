import { supabase } from '../supabase/client';

export interface DashboardMetrics {
  todaySalesAmount: number;
  todaySalesCount: number;
  monthSalesAmount: number;
  monthExpensesAmount: number;
  totalProductsCount: number;
  lowStockProductsCount: number;
  lowStockProducts: Array<{ id: number; nombre: string; stock: number; stock_minimo: number; codigo?: string }>;
  totalClientsCount: number;
  totalSuppliersCount: number;
  pendingBudgetsCount: number;
  pendingMunicipioOrdersCount: number;
  recentSales: Array<{ id: number; fecha: string; total: number; cliente: string; metodo_pago: string; producto_nombre?: string }>;
}

export const dashboardWebService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

    try {
      // Parallel queries using Promise.all for speed & optimization
      const [
        salesRes,
        expensesRes,
        productsRes,
        clientsRes,
        suppliersRes,
        budgetsRes,
        municipioRes,
      ] = await Promise.all([
        supabase.from('ventas').select('*, productos(nombre)').order('fecha', { ascending: false }),
        supabase.from('gastos').select('monto, fecha'),
        supabase.from('productos').select('id, nombre, codigo, stock, stock_minimo'),
        supabase.from('clientes').select('id', { count: 'exact' }),
        supabase.from('proveedores').select('id', { count: 'exact' }),
        supabase.from('presupuestos').select('id', { count: 'exact' }).eq('estado', 'Pendiente'),
        supabase.from('municipio_ordenes').select('id', { count: 'exact' }).eq('estado', 'Pendiente'),
      ]);

      // Process Sales
      const sales = salesRes.data || [];
      const todaySales = sales.filter((s) => s.fecha && s.fecha.startsWith(todayStr));
      const monthSales = sales.filter((s) => s.fecha && s.fecha.startsWith(monthStr));

      const todaySalesAmount = todaySales.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      const monthSalesAmount = monthSales.reduce((acc, curr) => acc + Number(curr.total || 0), 0);

      const recentSales = sales.slice(0, 5).map((s: any) => ({
        id: s.id,
        fecha: s.fecha,
        total: Number(s.total || 0),
        cliente: s.cliente || 'Consumidor Final',
        metodo_pago: s.metodo_pago || 'Efectivo',
        producto_nombre: s.productos?.nombre || (s.producto_id ? `Producto #${s.producto_id}` : 'Venta General'),
      }));

      // Process Expenses
      const expenses = expensesRes.data || [];
      const monthExpenses = expenses.filter((g) => g.fecha && g.fecha.startsWith(monthStr));
      const monthExpensesAmount = monthExpenses.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

      // Process Products & Low Stock
      const products = productsRes.data || [];
      const lowStockProducts = products.filter((p) => Number(p.stock || 0) <= Number(p.stock_minimo || 10));

      return {
        todaySalesAmount,
        todaySalesCount: todaySales.length,
        monthSalesAmount,
        monthExpensesAmount,
        totalProductsCount: products.length,
        lowStockProductsCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.slice(0, 5),
        totalClientsCount: clientsRes.count ?? clientsRes.data?.length ?? 0,
        totalSuppliersCount: suppliersRes.count ?? suppliersRes.data?.length ?? 0,
        pendingBudgetsCount: budgetsRes.count ?? budgetsRes.data?.length ?? 0,
        pendingMunicipioOrdersCount: municipioRes.count ?? municipioRes.data?.length ?? 0,
        recentSales,
      };
    } catch (err: unknown) {
      console.error('[dashboardWebService] Error al calcular métricas:', err);
      throw err;
    }
  }
};
