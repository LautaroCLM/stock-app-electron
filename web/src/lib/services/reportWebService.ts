import { supabase } from '../supabase/client';
import { PeriodFilter } from '@/types/finance';
import {
  FullReportMetrics,
  TopProductReportItem,
  CategoryReportItem,
  PaymentMethodReportItem,
  LowStockReportItem,
  DetailedSaleReportItem,
} from '@/types/report';

/**
 * Retorna el string ISO en hora local de Argentina (UTC-3) para inicio del día (00:00:00.000)
 */
function getArgStartOfDayISO(dateStr?: string): string {
  if (dateStr && dateStr.trim()) {
    return `${dateStr.trim()}T00:00:00.000-03:00`;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000-03:00`;
}

/**
 * Retorna el string ISO en hora local de Argentina (UTC-3) para fin del día (23:59:59.999)
 */
function getArgEndOfDayISO(dateStr?: string): string {
  if (dateStr && dateStr.trim()) {
    return `${dateStr.trim()}T23:59:59.999-03:00`;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59.999-03:00`;
}

export const reportWebService = {
  /**
   * Obtiene todas las métricas de Informes desde Supabase para el período seleccionado
   */
  async getReportMetrics(
    period: PeriodFilter = 'mes',
    customDate?: string
  ): Promise<FullReportMetrics> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonthStr = `${currentYear}-${currentMonth}`;

      let startISO: string;
      let endISO: string;
      let periodLabel = 'Mes actual';

      if (customDate && customDate.trim() !== '') {
        startISO = getArgStartOfDayISO(customDate);
        endISO = getArgEndOfDayISO(customDate);
        periodLabel = `Fecha: ${customDate.trim()}`;
      } else {
        switch (period) {
          case 'hoy': {
            startISO = getArgStartOfDayISO();
            endISO = getArgEndOfDayISO();
            periodLabel = 'Hoy';
            break;
          }
          case 'semana': {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 6);
            const y = sevenDaysAgo.getFullYear();
            const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
            const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
            startISO = `${y}-${m}-${d}T00:00:00.000-03:00`;
            endISO = getArgEndOfDayISO();
            periodLabel = 'Última semana';
            break;
          }
          case 'mes': {
            startISO = `${currentMonthStr}-01T00:00:00.000-03:00`;
            const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
            endISO = `${currentMonthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999-03:00`;
            periodLabel = 'Mes actual';
            break;
          }
          case 'año': {
            startISO = `${currentYear}-01-01T00:00:00.000-03:00`;
            endISO = `${currentYear}-12-31T23:59:59.999-03:00`;
            periodLabel = 'Año en curso';
            break;
          }
        }
      }

      // Consultas paralelas optimizadas a Supabase
      const [salesRes, productsRes, historialRes] = await Promise.all([
        supabase
          .from('ventas')
          .select('id, producto_id, cantidad, total, metodo_pago, cliente, fecha, productos(id, nombre, categoria)')
          .gte('fecha', startISO)
          .lte('fecha', endISO)
          .order('fecha', { ascending: false }),

        supabase
          .from('productos')
          .select('id, nombre, categoria, stock, unidad, stock_minimo')
          .order('nombre', { ascending: true }),

        supabase
          .from('historial')
          .select('id, accion, detalle, fecha')
          .gte('fecha', startISO)
          .lte('fecha', endISO),
      ]);

      if (salesRes.error) {
        console.error('[reportWebService] Error consultando ventas:', salesRes.error.message);
      }

      const rawSales = salesRes.data || [];
      const products = productsRes.data || [];
      const historial = historialRes.data || [];

      // 1. Totales Generales
      const totalRevenue = rawSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const totalSalesCount = rawSales.length;
      const totalUnitsSoldCount = rawSales.reduce((acc, s) => acc + Number(s.cantidad || 0), 0);
      const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

      // 2. Agrupación de Ventas por Producto
      const productSalesMap = new Map<string, { id?: number; nombre: string; cantidad: number; total: number }>();
      
      rawSales.forEach((s: any) => {
        const prodName = s.productos?.nombre || (s.producto_id ? `Producto #${s.producto_id}` : 'Venta Directa');
        const current = productSalesMap.get(prodName) || {
          id: s.producto_id || undefined,
          nombre: prodName,
          cantidad: 0,
          total: 0,
        };
        current.cantidad += Number(s.cantidad || 0);
        current.total += Number(s.total || 0);
        productSalesMap.set(prodName, current);
      });

      const aggregatedProducts: TopProductReportItem[] = Array.from(productSalesMap.values());

      const mostSoldProducts = [...aggregatedProducts].sort((a, b) => b.cantidad - a.cantidad);
      const leastSoldProducts = [...aggregatedProducts].sort((a, b) => a.cantidad - b.cantidad);

      const topProduct = mostSoldProducts.length > 0 ? mostSoldProducts[0] : null;
      const bottomProduct = leastSoldProducts.length > 0 ? leastSoldProducts[0] : null;

      // 3. Agrupación de Ventas por Categoría
      const categorySalesMap = new Map<string, { cantidad: number; total: number }>();

      rawSales.forEach((s: any) => {
        const catName = s.productos?.categoria?.trim() || 'General';
        const current = categorySalesMap.get(catName) || { cantidad: 0, total: 0 };
        current.cantidad += Number(s.cantidad || 0);
        current.total += Number(s.total || 0);
        categorySalesMap.set(catName, current);
      });

      const categoryBreakdown: CategoryReportItem[] = Array.from(categorySalesMap.entries())
        .map(([categoria, item]) => ({
          categoria,
          cantidad: item.cantidad,
          total: item.total,
          porcentaje: totalUnitsSoldCount > 0 ? Math.round((item.cantidad / totalUnitsSoldCount) * 100) : 0,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

      // 4. Agrupación por Métodos de Pago
      const paymentMap = new Map<string, { total: number; cantidad: number }>();

      rawSales.forEach((s) => {
        const method = s.metodo_pago?.trim() || 'Efectivo';
        const current = paymentMap.get(method) || { total: 0, cantidad: 0 };
        current.total += Number(s.total || 0);
        current.cantidad += 1;
        paymentMap.set(method, current);
      });

      const paymentMethodBreakdown: PaymentMethodReportItem[] = Array.from(paymentMap.entries())
        .map(([metodo, item]) => ({
          metodo,
          total: item.total,
          cantidad: item.cantidad,
          porcentaje: totalRevenue > 0 ? Math.round((item.total / totalRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // 5. Métricas de Resumen de Registros
      let productsEnteredCount = 0;
      let productsDeletedCount = 0;

      historial.forEach((h) => {
        const act = (h.accion || '').toLowerCase();
        if (act.includes('importar') || act.includes('agregar')) {
          productsEnteredCount++;
        } else if (act.includes('eliminar')) {
          productsDeletedCount++;
        }
      });

      const currentTotalStock = products.reduce((acc, p) => acc + Number(p.stock || 0), 0);

      const lowStockProducts: LowStockReportItem[] = products
        .filter((p) => Number(p.stock || 0) < Number(p.stock_minimo || 5))
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          stock: Number(p.stock || 0),
          unidad: p.unidad || 'un',
          stock_minimo: Number(p.stock_minimo || 5),
        }))
        .sort((a, b) => a.stock - b.stock);

      // 6. Detalle Histórico de Ventas
      const detailedSales: DetailedSaleReportItem[] = rawSales.map((s: any) => ({
        id: s.id,
        fecha: s.fecha || new Date().toISOString(),
        producto_id: s.producto_id || null,
        producto_nombre: s.productos?.nombre || (s.producto_id ? `Producto #${s.producto_id}` : 'Venta Directa'),
        cantidad: Number(s.cantidad || 1),
        total: Number(s.total || 0),
        metodo_pago: s.metodo_pago || 'Efectivo',
        cliente: s.cliente || 'Consumidor Final',
      }));

      return {
        period,
        customDate,
        periodLabel,
        totalRevenue,
        totalSalesCount,
        totalUnitsSoldCount,
        averageTicket,
        topProduct,
        bottomProduct,
        topCategory,
        productsEnteredCount,
        productsDeletedCount,
        currentTotalStock,
        categoryBreakdown,
        paymentMethodBreakdown,
        mostSoldProducts,
        leastSoldProducts,
        lowStockProducts,
        detailedSales,
      };
    } catch (err: unknown) {
      console.error('[reportWebService] Excepción en getReportMetrics:', err);
      throw err;
    }
  },
};
