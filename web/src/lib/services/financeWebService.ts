import { supabase } from '../supabase/client';
import {
  FinanceMetrics,
  DesktopFinanceMetrics,
  PeriodFilter,
  DailySalesMetric,
  PaymentMethodMetric,
  FinancialTransaction,
} from '@/types/finance';

/**
 * Convierte una fecha a string ISO en la zona horaria de Argentina (UTC-3) para inicio del día (00:00:00)
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
 * Convierte una fecha a string ISO en la zona horaria de Argentina (UTC-3) para fin del día (23:59:59)
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

export const financeWebService = {
  /**
   * Métricas secundarias para el módulo de Informes
   */
  async getFinanceMetrics(period: PeriodFilter = 'hoy', customDate?: string): Promise<FinanceMetrics> {
    try {
      const [salesRes, productsRes] = await Promise.all([
        supabase
          .from('ventas')
          .select('id, producto_id, cantidad, total, fecha, productos(id, nombre, categoria)'),
        supabase
          .from('productos')
          .select('id, nombre, categoria, stock, unidad, stock_minimo')
          .order('stock', { ascending: true }),
      ]);

      if (salesRes.error) {
        console.error('[financeWebService] Error al consultar ventas:', salesRes.error.message);
        throw new Error(`Error en ventas: ${salesRes.error.message}`);
      }

      if (productsRes.error) {
        console.error('[financeWebService] Error al consultar productos:', productsRes.error.message);
        throw new Error(`Error en productos: ${productsRes.error.message}`);
      }

      const allSales = salesRes.data || [];
      const allProducts = productsRes.data || [];

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const monthStr = now.toISOString().substring(0, 7);
      const yearStr = String(now.getFullYear());

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      let filteredSales = allSales;

      if (customDate && customDate.trim() !== '') {
        filteredSales = allSales.filter((s) => s.fecha && s.fecha.startsWith(customDate.trim()));
      } else {
        switch (period) {
          case 'hoy':
            filteredSales = allSales.filter((s) => s.fecha && s.fecha.startsWith(todayStr));
            break;
          case 'semana':
            filteredSales = allSales.filter((s) => {
              if (!s.fecha) return false;
              const saleDate = new Date(s.fecha);
              return saleDate >= sevenDaysAgo;
            });
            break;
          case 'mes':
            filteredSales = allSales.filter((s) => s.fecha && s.fecha.startsWith(monthStr));
            break;
          case 'año':
            filteredSales = allSales.filter((s) => s.fecha && s.fecha.startsWith(yearStr));
            break;
        }
      }

      const productsSoldCount = filteredSales.reduce((acc, s) => acc + Number(s.cantidad || 0), 0);

      const salesByProductMap = new Map<string, { nombre: string; cantidad: number }>();
      filteredSales.forEach((s: any) => {
        const prodName = s.productos?.nombre || (s.producto_id ? `Producto #${s.producto_id}` : 'Venta Directa');
        const current = salesByProductMap.get(prodName) || { nombre: prodName, cantidad: 0 };
        current.cantidad += Number(s.cantidad || 0);
        salesByProductMap.set(prodName, current);
      });

      const productAggregates = Array.from(salesByProductMap.values()).sort((a, b) => b.cantidad - a.cantidad);
      const topProduct = productAggregates.length > 0 ? productAggregates[0] : null;
      const bottomProduct = productAggregates.length > 0 ? productAggregates[productAggregates.length - 1] : null;

      const salesByCategoryMap = new Map<string, number>();
      filteredSales.forEach((s: any) => {
        const catName = s.productos?.categoria || 'General';
        const currentQty = salesByCategoryMap.get(catName) || 0;
        salesByCategoryMap.set(catName, currentQty + Number(s.cantidad || 0));
      });

      const categoryAggregates = Array.from(salesByCategoryMap.entries())
        .map(([categoria, cantidad]) => ({ categoria, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      const topCategory = categoryAggregates.length > 0 ? categoryAggregates[0] : null;

      const currentTotalStock = allProducts.reduce((acc, p) => acc + Number(p.stock || 0), 0);

      const lowStockProducts = allProducts
        .filter((p) => Number(p.stock || 0) < 5)
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          stock: Number(p.stock || 0),
          unidad: p.unidad || 'un',
        }));

      return {
        topProduct,
        bottomProduct,
        topCategory,
        productsEnteredCount: null,
        productsDeletedCount: null,
        productsSoldCount,
        currentTotalStock,
        lowStockProducts,
      };
    } catch (err: unknown) {
      console.error('[financeWebService] Error en getFinanceMetrics:', err);
      throw err;
    }
  },

  /**
   * Métricas en tiempo real para el Dashboard de Finanzas
   * Realiza consultas eficientes directamente a Supabase filtrando por fechas y zona horaria (UTC-3)
   */
  async getDesktopFinanceMetrics(
    period: PeriodFilter = 'hoy',
    customDate?: string,
    targetYearMonth?: string
  ): Promise<DesktopFinanceMetrics> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonthStr = `${currentYear}-${currentMonth}`; // "YYYY-MM"

      const selectedYearMonth = targetYearMonth || currentMonthStr;

      // 1. Determinar Rango de Fechas para el Período Seleccionado
      let startPeriodISO: string;
      let endPeriodISO: string;
      let periodLabel = 'Total de ventas del día';

      if (customDate && customDate.trim() !== '') {
        startPeriodISO = getArgStartOfDayISO(customDate);
        endPeriodISO = getArgEndOfDayISO(customDate);
        periodLabel = `Total de ventas del ${customDate.trim()}`;
      } else {
        switch (period) {
          case 'hoy': {
            startPeriodISO = getArgStartOfDayISO();
            endPeriodISO = getArgEndOfDayISO();
            periodLabel = 'Total de ventas del día';
            break;
          }
          case 'semana': {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 6);
            const y = sevenDaysAgo.getFullYear();
            const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
            const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
            startPeriodISO = `${y}-${m}-${d}T00:00:00.000-03:00`;
            endPeriodISO = getArgEndOfDayISO();
            periodLabel = 'Total de ventas de la última semana';
            break;
          }
          case 'mes': {
            startPeriodISO = `${currentMonthStr}-01T00:00:00.000-03:00`;
            const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
            endPeriodISO = `${currentMonthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999-03:00`;
            periodLabel = 'Total de ventas del mes';
            break;
          }
          case 'año': {
            startPeriodISO = `${currentYear}-01-01T00:00:00.000-03:00`;
            endPeriodISO = `${currentYear}-12-31T23:59:59.999-03:00`;
            periodLabel = 'Total de ventas del año';
            break;
          }
        }
      }

      // 2. Determinar Rango para Ventas de Hoy
      const todayStartISO = getArgStartOfDayISO();
      const todayEndISO = getArgEndOfDayISO();

      // 3. Determinar Rango para Ventas del Mes en Curso
      const monthStartISO = `${currentMonthStr}-01T00:00:00.000-03:00`;
      const daysInCurrentMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      const monthEndISO = `${currentMonthStr}-${String(daysInCurrentMonth).padStart(2, '0')}T23:59:59.999-03:00`;

      // 4. Determinar Rango para el Gráfico del Mes Seleccionado
      const [chartYear, chartMonthNum] = selectedYearMonth.split('-').map(Number);
      const chartDaysInMonth = new Date(chartYear, chartMonthNum, 0).getDate();
      const chartMonthStartISO = `${selectedYearMonth}-01T00:00:00.000-03:00`;
      const chartMonthEndISO = `${selectedYearMonth}-${String(chartDaysInMonth).padStart(2, '0')}T23:59:59.999-03:00`;

      // 5. Consultas paralelas a Supabase con deduplicación inteligente de rangos
      const isCurrentMonthChart = selectedYearMonth === currentMonthStr;
      const isDefaultPeriod = !customDate && (period === 'hoy' || period === 'mes');

      const [
        monthSalesRes,
        periodSalesRes,
        chartSalesRes,
        monthExpensesRes,
        monthPayrollRes,
        clientPaymentsRes,
        muniPaymentsRes,
        atmosPaymentsRes,
        supplierPaymentsRes,
        ajustesCajaRes,
        ticketsCountRes,
        muniOrdersRes,
        atmosOrdersRes,
        supplierPurchasesRes,
      ] = await Promise.all([
        // Consulta principal de ventas del mes en curso (incluye id, total, fecha, metodo_pago, cliente)
        supabase
          .from('ventas')
          .select('id, total, fecha, metodo_pago, cliente')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        // Consulta de período solo si difiere del mes/día actual o tiene fecha personalizada
        !isDefaultPeriod
          ? supabase
              .from('ventas')
              .select('id, total, fecha, metodo_pago, cliente')
              .gte('fecha', startPeriodISO)
              .lte('fecha', endPeriodISO)
          : Promise.resolve({ data: null, error: null }),

        // Consulta de gráfico solo si el mes seleccionado no es el mes actual
        !isCurrentMonthChart
          ? supabase
              .from('ventas')
              .select('id, total, fecha, metodo_pago')
              .gte('fecha', chartMonthStartISO)
              .lte('fecha', chartMonthEndISO)
          : Promise.resolve({ data: null, error: null }),

        supabase
          .from('gastos')
          .select('id, monto, fecha, concepto, estado')
          .eq('estado', 'Pagado')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('empleado_liquidaciones')
          .select('id, total_liquidacion, mes, created_at')
          .gte('created_at', monthStartISO),

        supabase
          .from('pagos_cliente')
          .select('id, monto, fecha')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('municipio_pagos')
          .select('id, monto, fecha')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('atmos_pagos')
          .select('id, monto, fecha')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('pagos_proveedor')
          .select('id, monto, fecha')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('ajustes_caja')
          .select('id, monto, fecha, tipo')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .gte('fecha', startPeriodISO)
          .lte('fecha', endPeriodISO),

        supabase
          .from('municipio_ordenes')
          .select('id, total, fecha')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('atmos_ordenes')
          .select('id, monto, fecha')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        supabase
          .from('compras_proveedor')
          .select('id, total, fecha, estado')
          .eq('estado', 'Completado')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),
      ]);

      if (monthSalesRes.error) {
        console.error('[financeWebService] Error en monthSales:', monthSalesRes.error.message);
      }

      const monthSalesData = monthSalesRes.data || [];
      
      // Derivar ventas de hoy a partir del mes en curso (coincidencia matemática exacta)
      const todaySalesData = monthSalesData.filter((s) => s.fecha && s.fecha >= todayStartISO && s.fecha <= todayEndISO);

      // Derivar ventas del período si no se requirió consulta externa
      const periodSales = periodSalesRes.data
        ? periodSalesRes.data
        : period === 'hoy'
        ? todaySalesData
        : monthSalesData;

      // Derivar ventas para el gráfico
      const chartSalesData = isCurrentMonthChart ? monthSalesData : chartSalesRes.data || [];

      const monthExpensesData = monthExpensesRes.data || [];
      const monthPayrollsData = monthPayrollRes.data || [];
      const clientPaymentsData = clientPaymentsRes.data || [];
      const muniPaymentsData = muniPaymentsRes.data || [];
      const atmosPaymentsData = atmosPaymentsRes.data || [];
      const supplierPaymentsData = supplierPaymentsRes.data || [];
      const ajustesCajaData = ajustesCajaRes.data || [];
      const muniOrdersData = muniOrdersRes.data || [];
      const atmosOrdersData = atmosOrdersRes.data || [];
      const supplierPurchasesData = supplierPurchasesRes.data || [];

      // Flujo de Caja Real (Caja Efectiva)
      const cashSalesTotal = periodSales
        .filter((s) => s.metodo_pago !== 'Cuenta Corriente')
        .reduce((acc, s) => acc + Number(s.total || 0), 0);

      const clientPaymentsTotal = clientPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const muniPaymentsTotal = muniPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const atmosPaymentsTotal = atmosPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);

      const cashInflows = cashSalesTotal + clientPaymentsTotal + muniPaymentsTotal + atmosPaymentsTotal;

      const monthExpensesTotal = monthExpensesData.reduce((acc, g) => acc + Number(g.monto || 0), 0);
      const supplierPaymentsTotal = supplierPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);

      const cashOutflows = monthExpensesTotal + supplierPaymentsTotal;

      const ajustesTotal = ajustesCajaData.reduce((acc, a) => {
        const tipo = (a.tipo || '').toUpperCase();
        const val = Number(a.monto || 0);
        if (tipo === 'INGRESO') return acc + val;
        if (tipo === 'EGRESO' || tipo === 'RETIRO' || tipo === 'VENTA ANULADA') return acc - val;
        return acc;
      }, 0);

      const totalPeriodSales = cashInflows - cashOutflows + ajustesTotal;
      const periodSalesCount = ticketsCountRes.count ?? periodSales.length;

      const todaySales = todaySalesData.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const todaySalesCount = todaySalesData.length;

      const monthSales = monthSalesData.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const monthSalesCount = monthSalesData.length;

      const monthExpenses = monthExpensesTotal;

      const monthPayrollExpenses = monthPayrollsData
        .filter((p) => (p.mes && p.mes.startsWith(currentMonthStr)) || (p.created_at && p.created_at.startsWith(currentMonthStr)))
        .reduce((acc, p) => acc + Number(p.total_liquidacion || 0), 0);

      // P&L Devengado Completo (Igual a Electron main.js)
      const ventasDevengadas = monthSales;
      const municipioDevengado = muniOrdersData.reduce((acc, o) => acc + Number(o.total || 0), 0);
      const atmosDevengado = atmosOrdersData.reduce((acc, o) => acc + Number(o.monto || 0), 0);
      const totalIngresosDevengados = ventasDevengadas + municipioDevengado + atmosDevengado;

      const gastosDevengados = monthExpenses;
      const sueldosDevengados = monthPayrollExpenses;
      const comprasDevengadas = supplierPurchasesData.reduce((acc, c) => acc + Number(c.total || 0), 0);
      const totalEgresosDevengados = gastosDevengados + sueldosDevengados + comprasDevengadas;

      const resultadoOperativo = totalIngresosDevengados - totalEgresosDevengados;
      const flujoCajaReal = cashInflows - cashOutflows + ajustesTotal;

      const monthNetBalance = resultadoOperativo;

      // Desglose por día para el Gráfico
      const salesByDayMap = new Map<string, number>();
      chartSalesData.forEach((s) => {
        if (!s.fecha) return;
        // Ajustar a fecha local
        const dateObj = new Date(s.fecha);
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const current = salesByDayMap.get(dayStr) || 0;
        salesByDayMap.set(dayStr, current + Number(s.total || 0));
      });

      const salesByDay: DailySalesMetric[] = [];
      for (let i = 1; i <= chartDaysInMonth; i++) {
        const dia = String(i).padStart(2, '0');
        salesByDay.push({
          dia,
          total: salesByDayMap.get(dia) || 0,
        });
      }

      // Métodos de Pago del Período / Gráfico
      const paymentMap = new Map<string, number>();
      let totalPaymentAmount = 0;

      const targetSalesForPayment = chartSalesData.length > 0 ? chartSalesData : periodSales;

      targetSalesForPayment.forEach((s) => {
        const method = s.metodo_pago?.trim() || 'Efectivo';
        const amount = Number(s.total || 0);
        paymentMap.set(method, (paymentMap.get(method) || 0) + amount);
        totalPaymentAmount += amount;
      });

      const paymentMethods: PaymentMethodMetric[] = Array.from(paymentMap.entries()).map(([metodo, total]) => ({
        metodo,
        total,
        porcentaje: totalPaymentAmount > 0 ? Math.round((total / totalPaymentAmount) * 100) : 0,
      }));

      // Transacciones Recientes (Ingresos y Egresos derivados en memoria)
      const recentSalesData = [...monthSalesData]
        .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
        .slice(0, 5);

      const recentExpensesData = [...monthExpensesData]
        .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
        .slice(0, 5);

      const recentSalesTx: FinancialTransaction[] = recentSalesData.map((s) => ({
        id: `sale-${s.id}`,
        fecha: s.fecha || new Date().toISOString(),
        concepto: `Venta #${s.id} - ${s.cliente || 'Consumidor Final'}`,
        tipo: 'ingreso',
        monto: Number(s.total || 0),
        metodo_pago: s.metodo_pago || 'Efectivo',
      }));

      const recentExpensesTx: FinancialTransaction[] = recentExpensesData.map((g) => ({
        id: `expense-${g.id}`,
        fecha: g.fecha || new Date().toISOString(),
        concepto: g.concepto || 'Gasto operativo',
        tipo: 'egreso',
        monto: Number(g.monto || 0),
      }));

      const recentTransactions = [...recentSalesTx, ...recentExpensesTx]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 7);

      return {
        totalPeriodSales,
        periodSalesCount,
        periodLabel,
        todaySales,
        todaySalesCount,
        monthSales,
        monthSalesCount,
        monthExpenses,
        monthPayrollExpenses,
        monthNetBalance,
        selectedYearMonth,
        salesByDay,
        paymentMethods,
        recentTransactions,

        // Contrato unificado
        ventasDevengadas,
        municipioDevengado,
        atmosDevengado,
        totalIngresosDevengados,
        gastosDevengados,
        comprasDevengadas,
        sueldosDevengados,
        totalEgresosDevengados,
        resultadoOperativo,
        flujoCajaReal,
      };
    } catch (err: unknown) {
      console.error('[financeWebService] Excepción en getDesktopFinanceMetrics:', err);
      throw err;
    }
  },
};
