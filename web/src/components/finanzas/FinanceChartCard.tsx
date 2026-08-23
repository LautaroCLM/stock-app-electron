'use client';

import React, { useMemo } from 'react';
import { DailySalesMetric } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, ChevronRight, BarChart2, Calendar } from 'lucide-react';

interface FinanceChartCardProps {
  selectedYearMonth: string;
  salesByDay: DailySalesMetric[];
  isLoading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const FinanceChartCard: React.FC<FinanceChartCardProps> = ({
  selectedYearMonth,
  salesByDay,
  isLoading,
  onPrevMonth,
  onNextMonth,
}) => {
  const [yearStr, monthStr] = selectedYearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const currentMonthLabel = `${MONTH_NAMES[monthIndex]} ${year}`;

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() === monthIndex;

  const maxSaleAmount = useMemo(() => {
    const max = Math.max(...salesByDay.map((d) => d.total), 0);
    return max > 0 ? max : 100;
  }, [salesByDay]);

  const hasSales = useMemo(() => {
    return salesByDay.some((d) => d.total > 0);
  }, [salesByDay]);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Encabezado del gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ventas por día
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evolución de ingresos durante {currentMonthLabel}
          </p>
        </div>

        {/* Selector de Mes Interactivo (< Mes Año >) */}
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2 flex items-center space-x-1.5 min-w-[110px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>{currentMonthLabel}</span>
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isCurrentMonth ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-ping" />
              Mes actual
            </span>
          ) : null}
        </div>
      </div>

      {/* Contenedor del gráfico */}
      <div className="pt-2 space-y-2">
        {isLoading ? (
          <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">
            Cargando evolución de ventas por día...
          </div>
        ) : !hasSales ? (
          <div className="h-64 w-full flex flex-col items-center justify-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-slate-400 text-xs">
            <BarChart2 className="w-8 h-8 opacity-40" />
            <span>No hay ventas registradas para este período.</span>
          </div>
        ) : (
          <div className="h-64 w-full flex items-end justify-between gap-1 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800 relative">
            {salesByDay.map((item, idx) => {
              const heightPercent = Math.max(
                (item.total / maxSaleAmount) * 100,
                item.total > 0 ? 6 : 2
              );
              const showLabel = idx % 5 === 0 || idx === salesByDay.length - 1;

              return (
                <div
                  key={item.dia}
                  className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30">
                    <div className="bg-slate-900 text-white text-[10px] font-mono px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap border border-slate-700">
                      <span className="text-slate-400 font-sans block">Día {parseInt(item.dia, 10)}</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(item.total)}</span>
                    </div>
                  </div>

                  {/* Bar element */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[14px] rounded-t-sm transition-all duration-300 ${
                      item.total > 0
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-500/20'
                        : 'bg-slate-200/60 dark:bg-slate-800/60'
                    }`}
                  />

                  {/* Axis Label */}
                  <span className="text-[10px] font-mono text-slate-400 mt-1">
                    {showLabel ? parseInt(item.dia, 10) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
