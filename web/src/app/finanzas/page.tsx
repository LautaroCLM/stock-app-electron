'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Receipt,
  Wallet,
  Loader2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from 'lucide-react';
import { DesktopFinanceMetrics, PeriodFilter } from '@/types/finance';
import { financeWebService } from '@/lib/services/financeWebService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { AdminGuard } from '@/components/auth/AdminGuard';

const NOMBRES_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export default function FinanzasPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('hoy');
  const [customDate, setCustomDate] = useState<string>('');
  
  // Mes seleccionado para el gráfico de "Ventas por día" (Formato "YYYY-MM")
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);

  const [metrics, setMetrics] = useState<DesktopFinanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar métricas financieras reales desde Supabase
  const fetchMetrics = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setIsLoading(true);
        setError(null);

        const data = await financeWebService.getDesktopFinanceMetrics(
          activePeriod,
          customDate,
          selectedYearMonth
        );
        setMetrics(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar los datos financieros de Supabase.';
        setError(msg);
        console.error('[FinanzasPage] Error en fetchMetrics:', err);
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [activePeriod, customDate, selectedYearMonth]
  );

  // Guardar la versión más reciente de fetchMetrics para la suscripción Realtime
  const fetchMetricsRef = useRef(fetchMetrics);
  useEffect(() => {
    fetchMetricsRef.current = fetchMetrics;
  }, [fetchMetrics]);

  // Carga inicial y cambio de filtros
  useEffect(() => {
    fetchMetrics(true);
  }, [fetchMetrics]);

  // Suscripción Realtime a las tablas financieras en Supabase (Se ejecuta SOLO una vez al montar)
  useEffect(() => {
    const financeTables = [
      'ventas',
      'gastos',
      'pagos_cliente',
      'compras_proveedor',
      'pagos_proveedor',
      'municipio_ordenes',
      'municipio_pagos',
      'atmos_ordenes',
      'atmos_pagos',
      'empleado_liquidaciones',
      'ajustes_caja',
    ];

    const channel = supabase.channel('realtime:finanzas_web_hub');

    financeTables.forEach((tableName) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          console.log(`[Finanzas Realtime Web] Cambio en ${tableName} [${payload.eventType}]. Actualizando métricas...`);
          fetchMetricsRef.current(false);
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Navegación interactiva de meses para el gráfico (< Mes Año >)
  const handlePrevMonth = () => {
    const [year, month] = selectedYearMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedYearMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // Label amigable para el mes del gráfico (ej: "Agosto 2026")
  const selectedMonthLabel = useMemo(() => {
    const [year, month] = selectedYearMonth.split('-').map(Number);
    const nombreMes = NOMBRES_MESES[month - 1] || 'Mes';
    return `${nombreMes} ${year}`;
  }, [selectedYearMonth]);

  const isCurrentMonthSelected = selectedYearMonth === currentYearMonth;

  // Cálculo del valor máximo del gráfico para escalar las barras dinámicamente
  const maxDailySale = useMemo(() => {
    if (!metrics?.salesByDay || metrics.salesByDay.length === 0) return 100;
    const max = Math.max(...metrics.salesByDay.map((d) => d.total));
    return max > 0 ? max : 100;
  }, [metrics?.salesByDay]);

  return (
    <AdminGuard>
      <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            Finanzas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Resumen en tiempo real de ventas e ingresos del negocio (Web + Electron)
          </p>
        </div>

        {/* Botón de Refrescar manual */}
        <button
          type="button"
          onClick={() => fetchMetrics(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* CARD CONTENEDOR PRINCIPAL */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-6">
        {/* BARRA DE FILTROS SUPERIOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          {/* Period selector pills */}
          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800/80 overflow-x-auto custom-scrollbar">
            {(['hoy', 'semana', 'mes', 'año'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setActivePeriod(period);
                  setCustomDate('');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all whitespace-nowrap ${
                  activePeriod === period && !customDate
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {period === 'hoy'
                  ? 'Hoy'
                  : period === 'semana'
                  ? 'Semana'
                  : period === 'mes'
                  ? 'Mes'
                  : 'Año'}
              </button>
            ))}
          </div>

          {/* Date Picker + Search Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-medium text-slate-400 hidden sm:inline">Fecha exacta:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-transparent text-slate-100 text-xs focus:outline-none font-mono"
              />
            </div>
            {customDate && (
              <button
                type="button"
                onClick={() => {
                  setCustomDate('');
                  setActivePeriod('hoy');
                }}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchMetrics(true)}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-md shadow-blue-600/20"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* ESTADO DE ERROR */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-2xl flex items-center justify-between gap-4 text-red-200 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchMetrics(true)}
              className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-white rounded-xl transition-colors font-semibold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ESTADO DE CARGA */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Consultando datos financieros en Supabase...</p>
          </div>
        ) : metrics ? (
          <>
            {/* METRICS CARDS GRID (5 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {/* CARD 1: TOTAL DEL PERÍODO */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20 flex flex-col justify-between min-h-[135px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                    TOTAL DEL PERÍODO
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
                    {formatCurrency(metrics.totalPeriodSales)}
                  </h3>
                  <p className="text-[11px] text-blue-100 mt-1">
                    {metrics.periodLabel} ({metrics.periodSalesCount} ventas)
                  </p>
                </div>
              </div>

              {/* CARD 2: VENTAS HOY */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 border-t-4 border-t-emerald-500 shadow-sm flex flex-col justify-between min-h-[135px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    VENTAS HOY
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
                    {formatCurrency(metrics.todaySales)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {metrics.todaySalesCount} {metrics.todaySalesCount === 1 ? 'venta registrada hoy' : 'ventas registradas hoy'}
                  </p>
                </div>
              </div>

              {/* CARD 3: VENTAS DEL MES */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 border-t-4 border-t-purple-500 shadow-sm flex flex-col justify-between min-h-[135px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    VENTAS DEL MES
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
                    {formatCurrency(metrics.monthSales)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {metrics.monthSalesCount} ventas en el mes en curso
                  </p>
                </div>
              </div>

              {/* CARD 4: VENTAS REALIZADAS */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 border-t-4 border-t-amber-500 shadow-sm flex flex-col justify-between min-h-[135px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    TRANSACCIONES
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
                    {metrics.periodSalesCount}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Operaciones en el período seleccionado
                  </p>
                </div>
              </div>

              {/* CARD 5: GASTOS DEL MES */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 border-t-4 border-t-rose-500 shadow-sm flex flex-col justify-between min-h-[135px] sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    GASTOS DEL MES
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
                    {formatCurrency(metrics.monthExpenses)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gastos operacionales registrados del mes
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN CHART DE "Ventas por día" */}
            <div className="p-4 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-6">
              {/* Encabezado del gráfico */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Ventas por día
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evolución diaria de ingresos durante {selectedMonthLabel}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Selector de Mes Interactivo */}
                  <div className="inline-flex items-center space-x-3 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-200">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title="Mes anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="min-w-[100px] text-center font-mono">{selectedMonthLabel}</span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title="Mes siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badge "Mes actual" */}
                  {isCurrentMonthSelected && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-600/90 text-white shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                      Mes actual
                    </span>
                  )}
                </div>
              </div>

              {/* Visualización del Gráfico por Barras */}
              {metrics.salesByDay.some((d) => d.total > 0) ? (
                <div className="relative h-64 w-full flex flex-col justify-between pt-4">
                  {/* Container de Barras y Ejes */}
                  <div className="relative flex-1 flex items-end justify-between gap-1 sm:gap-2 pb-6 border-b border-slate-800">
                    {metrics.salesByDay.map((dayItem) => {
                      const heightPercent = maxDailySale > 0 ? (dayItem.total / maxDailySale) * 100 : 0;
                      const hasSale = dayItem.total > 0;
                      return (
                        <div
                          key={dayItem.dia}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        >
                          {/* Tooltip Hover */}
                          {hasSale && (
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-800 text-white text-[10px] font-mono py-1 px-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
                              Día {dayItem.dia}: {formatCurrency(dayItem.total)}
                            </div>
                          )}

                          {/* Barra visual */}
                          <div
                            style={{ height: `${Math.max(hasSale ? 8 : 2, heightPercent)}%` }}
                            className={`w-full max-w-[18px] rounded-t-sm transition-all duration-300 ${
                              hasSale
                                ? 'bg-blue-600 group-hover:bg-blue-500 shadow-sm shadow-blue-500/30'
                                : 'bg-slate-800/40'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Eje X (Días) */}
                  <div className="flex justify-between items-center pt-2 text-[10px] font-mono text-slate-500 overflow-x-auto">
                    {metrics.salesByDay.map((d, index) => {
                      // Mostrar labels cada 2 o 5 días para evitar colisión en pantallas chicas
                      const showLabel = index === 0 || index === metrics.salesByDay.length - 1 || (index + 1) % 5 === 0;
                      return (
                        <span key={d.dia} className={`text-center flex-1 ${showLabel ? 'opacity-100 font-semibold' : 'opacity-40'}`}>
                          {d.dia}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No se registraron ventas en el mes seleccionado ({selectedMonthLabel}).
                </div>
              )}
            </div>

            {/* SECCIÓN MÉTODOS DE PAGO Y TRANSACCIONES RECIENTES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CARD MÉTODOS DE PAGO */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    Ventas por Método de Pago
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {metrics.paymentMethods.length} métodos
                  </span>
                </div>

                {metrics.paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.paymentMethods.map((pm) => (
                      <div key={pm.metodo} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-300">{pm.metodo}</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-100">
                              {formatCurrency(pm.total)}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-950 text-purple-300 rounded-md border border-purple-800/50">
                              {pm.porcentaje}%
                            </span>
                          </div>
                        </div>
                        {/* Bar de porcentaje */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pm.porcentaje}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Sin operaciones en el período.
                  </div>
                )}
              </div>

              {/* CARD TRANSACCIONES RECIENTES */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    Últimos Movimientos
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ingresos y Gastos
                  </span>
                </div>

                {metrics.recentTransactions.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.recentTransactions.map((tx) => {
                      const isIncome = tx.tipo === 'ingreso';
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isIncome
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                              }`}
                            >
                              {isIncome ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                                {tx.concepto}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {formatDate(tx.fecha)} {tx.metodo_pago ? `• ${tx.metodo_pago}` : ''}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-mono font-bold ${
                              isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{formatCurrency(tx.monto)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No hay transacciones recientes.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <p className="text-sm font-semibold">El período seleccionado no tiene ventas registradas.</p>
            <p className="text-xs text-slate-500">Selecciona otro rango de fechas o registra ventas para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  </AdminGuard>
);
}
