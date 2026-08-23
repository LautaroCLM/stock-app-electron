'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { PeriodFilter } from '@/types/finance';
import { Search, RotateCcw, Clock, Calendar as CalendarIcon } from 'lucide-react';

interface FinanceFiltersProps {
  activePeriod: PeriodFilter;
  customDate: string;
  onPeriodChange: (period: PeriodFilter) => void;
  onCustomDateChange: (date: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

export const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  activePeriod,
  customDate,
  onPeriodChange,
  onCustomDateChange,
  onSearch,
  onClear,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Selector de Períodos */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          {(['hoy', 'semana', 'mes', 'año'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onPeriodChange(period)}
              className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                activePeriod === period && !customDate
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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

        {/* Filtro por fecha exacta */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Fecha exacta:</span>
          </div>
          <input
            type="date"
            value={customDate}
            onChange={(e) => onCustomDateChange(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button variant="primary" size="sm" onClick={onSearch} className="px-3.5 shadow-sm">
            <Search className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClear} className="px-3.5 border-slate-300 dark:border-slate-700">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Indicador del Período Activo */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          {customDate
            ? `Ventas filtradas por fecha: ${customDate}`
            : activePeriod === 'hoy'
            ? 'Período seleccionado: Hoy'
            : activePeriod === 'semana'
            ? 'Período seleccionado: Última semana'
            : activePeriod === 'mes'
            ? 'Período seleccionado: Mes actual'
            : 'Período seleccionado: Año en curso'}
        </span>
      </div>
    </div>
  );
};
