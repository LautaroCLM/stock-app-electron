'use client';

import React from 'react';
import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface PayrollFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const PayrollFilters: React.FC<PayrollFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedMonth,
  onMonthChange,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Search Input */}
      <div className="flex-1 max-w-md">
        <Input
          placeholder="Buscar por empleado..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Month Filter */}
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <input
          type="month"
          className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
        />
        {selectedMonth ? (
          <button
            onClick={() => onMonthChange('')}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
          >
            Todos
          </button>
        ) : null}
      </div>
    </div>
  );
};
