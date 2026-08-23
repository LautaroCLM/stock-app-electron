'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

interface AtmosfericoFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
}

export const AtmosfericoFilters: React.FC<AtmosfericoFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      {/* Search Bar */}
      <div className="w-full sm:max-w-md relative">
        <Input
          placeholder="Buscar por cliente, dirección, descripción..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 text-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Status Filter */}
      <div className="w-full sm:w-auto flex items-center space-x-2">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
          Estado:
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Pago parcial">Pago parcial</option>
          <option value="Cobrado">Cobrado</option>
        </select>
      </div>
    </div>
  );
};
