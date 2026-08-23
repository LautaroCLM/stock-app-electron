'use client';

import React from 'react';
import { TrendingUp, Calendar, Search, Eraser, Clock, RotateCcw } from 'lucide-react';
import { PeriodFilter } from '@/types/finance';
import { Button } from '@/components/ui/Button';

interface InformesHeaderProps {
  activePeriod: PeriodFilter;
  setActivePeriod: (period: PeriodFilter) => void;
  customDate: string;
  setCustomDate: (date: string) => void;
  onSearch: () => void;
  onReset: () => void;
  periodLabel: string;
  isLoading: boolean;
}

export const InformesHeader: React.FC<InformesHeaderProps> = ({
  activePeriod,
  setActivePeriod,
  customDate,
  setCustomDate,
  onSearch,
  onReset,
  periodLabel,
  isLoading,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Informes
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Análisis en tiempo real de ventas, métricas y movimientos
            </p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector pills */}
          <div className="inline-flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-x-auto custom-scrollbar">
            {(['hoy', 'semana', 'mes', 'año'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setActivePeriod(period)}
                className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all whitespace-nowrap ${
                  activePeriod === period && !customDate
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
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

          {/* Date search input + buttons */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl px-3 py-2 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-transparent text-slate-100 text-xs focus:outline-none font-mono"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSearch}
              disabled={isLoading}
              className="h-9 px-3.5 shadow-sm"
              title="Buscar por fecha"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
            {customDate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                className="h-9 px-3.5 border-slate-700"
                title="Limpiar fecha"
              >
                <Eraser className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSearch}
              disabled={isLoading}
              className="h-9 px-3 border-slate-800 text-slate-400 hover:text-slate-200"
              title="Refrescar datos"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Active period badge */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center text-xs text-blue-400 font-medium">
        <Clock className="w-3.5 h-3.5 mr-1.5" />
        <span>Período seleccionado: {periodLabel}</span>
      </div>
    </div>
  );
};
