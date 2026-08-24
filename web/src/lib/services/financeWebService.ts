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
 * Devuelve un objeto Date representativo de la fecha y hora actual en Argentina (UTC-3),
 * independientemente de la zona horaria del servidor (UTC en Vercel) o de la máquina local.
 */
function getArgentinaNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10) - 1; // 0-indexed
  const day = parseInt(getPart('day'), 10);
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Convierte una fecha a string ISO en la zona horaria de Argentina (UTC-3) para inicio del día (00:00:00)
 */
function getArgStartOfDayISO(dateStr?: string): string {
  if (dateStr && dateStr.trim()) {
    return `${dateStr.trim()}T00:00:00.000-03:00`;
  }
  const argNow = getArgentinaNow();
  const year = argNow.getUTCFullYear();
  const month = String(argNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(argNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000-03:00`;
}

/**
 * Convierte una fecha a string ISO en la zona horaria de Argentina (UTC-3) para fin del día (23:59:59)
 */
function getArgEndOfDayISO(dateStr?: string): string {
  if (dateStr && dateStr.trim()) {
    return `${dateStr.trim()}T23:59:59.999-03:00`;
  }
  const argNow = getArgentinaNow();
  const year = argNow.getUTCFullYear();
  const month = String(argNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(argNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59.999-03:00`;
}

/**
 * Convierte un string de fecha (ISO o 'YYYY-MM-DD HH:mm:ss') a timestamp numérico en ms.
 * Evita errores de comparación de caracteres (como espacio ' ' < 'T').
 */
function parseToTimestamp(dateVal?: string | Date | null): number | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal.getTime();

  let s = String(dateVal).trim();
  if (!s) return null;

  // Si tiene el formato 'YYYY-MM-DD HH:mm:ss', reemplazar el espacio por 'T'
  if (s.length >= 10 && s.charAt(10) === ' ') {
    s = s.substring(0, 10) + 'T' + s.substring(11);
  }

  const parsed = new Date(s);
  const time = parsed.getTime();
  return isNaN(time) ? null : time;
}

/**
 * Evalúa determinísticamente si una fecha se encuentra dentro de un intervalo ISO [startISO, endISO].
 */
function isDateInISOInterval(dateVal?: string | null, startISO?: string, endISO?: string): boolean {
  if (!dateVal) return false;
  const targetTs = parseToTimestamp(dateVal);
  if (targetTs === null) return false;

  const startTs = startISO ? parseToTimestamp(startISO) : null;
  const endTs = endISO ? parseToTimestamp(endISO) : null;

  if (startTs !== null && targetTs < startTs) return false;
  if (endTs !== null && targetTs > endTs) return false;

  return true;
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

      const argNow = getArgentinaNow();
      const yearStr = String(argNow.getUTCFullYear());
      const monthStr = `${yearStr}-${String(argNow.getUTCMonth() + 1).padStart(2, '0')}`;
      const todayStr = `${monthStr}-${String(argNow.getUTCDate()).padStart(2, '0')}`;

      const sevenDaysAgoTs = argNow.getTime() - 6 * 24 * 3600 * 1000;

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
              const ts = parseToTimestamp(s.fecha);
              return ts !== null && ts >= sevenDaysAgoTs;
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
   * Realiza consultas eficientes directamente a Supabase filtrando por fechas y zona horaria de Argentina (UTC-3)
   * Alineado 100% con la lógica de negocio de Electron main.js
   */
  async getDesktopFinanceMetrics(
    period: PeriodFilter = 'hoy',
    customDate?: string,
    targetYearMonth?: string
  ): Promise<DesktopFinanceMetrics> {
    try {
      const argNow = getArgentinaNow();
      const currentYear = argNow.getUTCFullYear();
      const currentMonth = String(argNow.getUTCMonth() + 1).padStart(2, '0');
      const currentMonthStr = `${currentYear}-${currentMonth}`; // "YYYY-MM"

      const selectedYearMonth = targetYearMonth || currentMonthStr;

      // 1. Rango de Fechas para el Período Seleccionado (ISO UTC-3)
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
            const sevenDaysAgoTs = argNow.getTime() - 6 * 24 * 3600 * 1000;
            const sevenDaysAgoDate = new Date(sevenDaysAgoTs);
            const y = sevenDaysAgoDate.getUTCFullYear();
            const m = String(sevenDaysAgoDate.getUTCMonth() + 1).padStart(2, '0');
            const d = String(sevenDaysAgoDate.getUTCDate()).padStart(2, '0');
            startPeriodISO = `${y}-${m}-${d}T00:00:00.000-03:00`;
            endPeriodISO = getArgEndOfDayISO();
            periodLabel = 'Total de ventas de la última semana';
            break;
          }
          case 'mes': {
            startPeriodISO = `${currentMonthStr}-01T00:00:00.000-03:00`;
            const daysInMonth = new Date(currentYear, argNow.getUTCMonth() + 1, 0).getDate();
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

      // 2. Rango para Ventas de Hoy
      const todayStartISO = getArgStartOfDayISO();
      const todayEndISO = getArgEndOfDayISO();

      // 3. Rango para Ventas del Mes en Curso
      const monthStartISO = `${currentMonthStr}-01T00:00:00.000-03:00`;
      const daysInCurrentMonth = new Date(currentYear, argNow.getUTCMonth() + 1, 0).getDate();
      const monthEndISO = `${currentMonthStr}-${String(daysInCurrentMonth).padStart(2, '0')}T23:59:59.999-03:00`;

      // 4. Rango para el Gráfico del Mes Seleccionado
      const [chartYear, chartMonthNum] = selectedYearMonth.split('-').map(Number);
      const chartDaysInMonth = new Date(chartYear, chartMonthNum, 0).getDate();
      const chartMonthStartISO = `${selectedYearMonth}-01T00:00:00.000-03:00`;
      const chartMonthEndISO = `${selectedYearMonth}-${String(chartDaysInMonth).padStart(2, '0')}T23:59:59.999-03:00`;

      // 5. Consultas paralelas a Supabase
      const isCurrentMonthChart = selectedYearMonth === currentMonthStr;
      const isDefaultPeriod = !customDate && (period === 'hoy' || period === 'mes');

      const [
        monthTicketsRes,
        periodTicketsRes,
        chartTicketsRes,
        monthExpensesRes,
        monthPayrollRes,
        clientPaymentsRes,
        muniPaymentsRes,
        atmosPaymentsRes,
        supplierPaymentsRes,
        ajustesCajaRes,
        muniOrdersRes,
        atmosOrdersRes,
        supplierPurchasesRes,
      ] = await Promise.all([
        // 1. Consulta principal de comprobantes (tickets) del mes en curso
        supabase
          .from('tickets')
          .select('id, total, fecha, metodo_pago, cliente, tipo')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

        // 2. Consulta del período solo si difiere del mes actual
        !isDefaultPeriod
          ? supabase
              .from('tickets')
              .select('id, total, fecha, metodo_pago, cliente, tipo')
              .gte('fecha', startPeriodISO)
              .lte('fecha', endPeriodISO)
          : Promise.resolve({ data: null, error: null }),

        // 3. Consulta para gráfico si el mes difiere
        !isCurrentMonthChart
          ? supabase
              .from('tickets')
              .select('id, total, fecha, metodo_pago, tipo')
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
          .select('id, monto, fecha, tipo, venta_id')
          .gte('fecha', monthStartISO)
          .lte('fecha', monthEndISO),

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

      // Registro de errores explícito sin ocultamiento silencioso
      if (monthTicketsRes.error) {
        console.error('[financeWebService] Error al consultar tickets:', monthTicketsRes.error.message);
      }
      if (ajustesCajaRes.error) {
        console.error('[financeWebService] Error al consultar ajustes_caja:', ajustesCajaRes.error.message);
      }
      if (monthExpensesRes.error) {
        console.error('[financeWebService] Error al consultar gastos:', monthExpensesRes.error.message);
      }

      const allMonthTickets = monthTicketsRes.data || [];
      const ajustesCajaData = ajustesCajaRes.data || [];

      // Identificar IDs de tickets anulados via ajustes_caja (tipo = 'Venta anulada' con venta_id)
      const annulledTicketIds = new Set<number>();
      ajustesCajaData.forEach((a: any) => {
        const tipo = (a.tipo || '').toLowerCase();
        if (tipo === 'venta anulada' && a.venta_id !== null && a.venta_id !== undefined && a.venta_id !== '') {
          annulledTicketIds.add(Number(a.venta_id));
        }
      });

      // Función de validación de ticket activo (no anulado y de tipo Venta)
      const isTicketValid = (t: any) => {
        if (t.tipo && t.tipo !== 'Venta') return false;
        if (annulledTicketIds.has(Number(t.id))) return false;
        return true;
      };

      // Filtrar tickets del mes válidos
      const monthSalesData = allMonthTickets.filter(isTicketValid);

      // Derivar ventas de hoy a partir de la comparación numérica de timestamps
      const todaySalesData = monthSalesData.filter((s) => isDateInISOInterval(s.fecha, todayStartISO, todayEndISO));

      // Derivar ventas del período
      const rawPeriodTickets = periodTicketsRes.data ? periodTicketsRes.data : isDefaultPeriod ? (period === 'hoy' ? todaySalesData : monthSalesData) : monthSalesData;
      const periodSales = rawPeriodTickets.filter(isTicketValid).filter((s) => isDateInISOInterval(s.fecha, startPeriodISO, endPeriodISO));

      // Derivar ventas para el gráfico
      const rawChartTickets = isCurrentMonthChart ? monthSalesData : chartTicketsRes.data || [];
      const chartSalesData = rawChartTickets.filter(isTicketValid);

      const monthExpensesData = monthExpensesRes.data || [];
      const monthPayrollsData = monthPayrollRes.data || [];
      const clientPaymentsData = clientPaymentsRes.data || [];
      const muniPaymentsData = muniPaymentsRes.data || [];
      const atmosPaymentsData = atmosPaymentsRes.data || [];
      const supplierPaymentsData = supplierPaymentsRes.data || [];
      const muniOrdersData = muniOrdersRes.data || [];
      const atmosOrdersData = atmosOrdersRes.data || [];
      const supplierPurchasesData = supplierPurchasesRes.data || [];

      // Flujo de Caja Real (Caja Efectiva)
      const cashSalesTotal = periodSales
        .filter((s) => !s.metodo_pago || s.metodo_pago !== 'Cuenta Corriente')
        .reduce((acc, s) => acc + Number(s.total || 0), 0);

      const clientPaymentsTotal = clientPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const muniPaymentsTotal = muniPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);
      const atmosPaymentsTotal = atmosPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);

      const cashInflows = cashSalesTotal + clientPaymentsTotal + muniPaymentsTotal + atmosPaymentsTotal;

      const monthExpensesTotal = monthExpensesData.reduce((acc, g) => acc + Number(g.monto || 0), 0);
      const supplierPaymentsTotal = supplierPaymentsData.reduce((acc, p) => acc + Number(p.monto || 0), 0);

      const cashOutflows = monthExpensesTotal + supplierPaymentsTotal;

      // Suma directa de monto de ajustes_caja (idéntico a Electron: (tipo != 'Venta anulada' OR venta_id IS NULL))
      // Los valores de monto en la BD ya vienen con su signo real (+ o -), por lo que se suman directamente sin invertir el signo.
      const ajustesTotal = ajustesCajaData
        .filter((a: any) => {
          const tipo = (a.tipo || '').toLowerCase();
          if (tipo === 'venta anulada' && a.venta_id !== null && a.venta_id !== undefined && a.venta_id !== '') {
            return false; // Ya excluido del subtotal de tickets
          }
          return isDateInISOInterval(a.fecha, startPeriodISO, endPeriodISO);
        })
        .reduce((acc: number, a: any) => acc + Number(a.monto || 0), 0);

      const totalPeriodSales = cashInflows - cashOutflows + ajustesTotal;
      const periodSalesCount = periodSales.length;

      const todaySales = todaySalesData.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const todaySalesCount = todaySalesData.length;

      const monthSales = monthSalesData.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const monthSalesCount = monthSalesData.length;

      const monthExpenses = monthExpensesTotal;

      const monthPayrollExpenses = monthPayrollsData
        .filter((p) => {
          if (p.mes && p.mes.startsWith(currentMonthStr)) return true;
          return isDateInISOInterval(p.created_at, monthStartISO, monthEndISO);
        })
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
        const ts = parseToTimestamp(s.fecha);
        if (ts === null) return;
        const dateObj = new Date(ts);
        const dayStr = String(dateObj.getUTCDate()).padStart(2, '0');
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
        .sort((a, b) => (parseToTimestamp(b.fecha) || 0) - (parseToTimestamp(a.fecha) || 0))
        .slice(0, 5);

      const recentExpensesData = [...monthExpensesData]
        .sort((a, b) => (parseToTimestamp(b.fecha) || 0) - (parseToTimestamp(a.fecha) || 0))
        .slice(0, 5);

      const recentSalesTx: FinancialTransaction[] = recentSalesData.map((s) => ({
        id: `ticket-${s.id}`,
        fecha: s.fecha || new Date().toISOString(),
        concepto: `Ticket #${s.id} - ${s.cliente || 'Consumidor Final'}`,
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
        .sort((a, b) => (parseToTimestamp(b.fecha) || 0) - (parseToTimestamp(a.fecha) || 0))
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
