'use client';

import React from 'react';
import { Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';

interface CashAdjustmentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedEfecto: string;
  onEfectoChange: (value: string) => void;
}

export const CashAdjustmentFilters: React.FC<CashAdjustmentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedEfecto,
  onEfectoChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por motivo, observación o ticket de venta (#)..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Type Filter */}
        <div className="relative min-w-[170px]">
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Todos los tipos</option>
            <option value="Venta anulada">Venta anulada</option>
            <option value="Error de carga">Error de carga</option>
            <option value="Retiro de efectivo">Retiro de efectivo</option>
            <option value="Ingreso manual">Ingreso manual</option>
            <option value="Diferencia de caja">Diferencia de caja</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        {/* Effect Filter */}
        <div className="relative min-w-[150px]">
          <select
            value={selectedEfecto}
            onChange={(e) => onEfectoChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Todos los sentidos</option>
            <option value="Ingreso">Positivos (+) Ingresos</option>
            <option value="Egreso">Negativos (-) Egresos</option>
          </select>
        </div>
      </div>
    </div>
  );
};
