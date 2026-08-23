'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface SaleFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
}

export const SaleFilters: React.FC<SaleFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Search Input */}
      <div className="flex-1 max-w-md">
        <Input
          placeholder="Buscar por cliente, producto o N° de venta..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Payment Method Filter */}
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedPaymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
        >
          <option value="">Todos los Métodos de Pago</option>
          <option value="Efectivo">Solo Efectivo</option>
          <option value="Transferencia">Solo Transferencia</option>
          <option value="Cuenta Corriente">Solo Cuenta Corriente</option>
          <option value="Tarjeta de Crédito">Solo Tarjeta de Crédito</option>
        </select>
      </div>
    </div>
  );
};
