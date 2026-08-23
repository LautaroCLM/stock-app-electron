'use client';

import React from 'react';
import { History, Calendar, Search, RotateCcw, CreditCard, Filter } from 'lucide-react';
import { PeriodFilter } from '@/types/finance';
import { HistoryDocumentType } from '@/types/history';
import { Button } from '@/components/ui/Button';

interface HistorialHeaderProps {
  documentType: HistoryDocumentType;
  setDocumentType: (type: HistoryDocumentType) => void;
  activePeriod: PeriodFilter;
  setActivePeriod: (period: PeriodFilter) => void;
  customDate: string;
  setCustomDate: (date: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const HistorialHeader: React.FC<HistorialHeaderProps> = ({
  documentType,
  setDocumentType,
  activePeriod,
  setActivePeriod,
  customDate,
  setCustomDate,
  searchQuery,
  setSearchQuery,
  paymentMethod,
  setPaymentMethod,
  onSearch,
  onReset,
  isLoading,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Encabezado Principal y Usuario Activo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Historial de Operaciones
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consulta en tiempo real de ventas, presupuestos y remitos (Web + Electron)
            </p>
          </div>
        </div>

        {/* Insignia de Usuario Administrador */}
        <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            A
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block leading-tight">
              Administrador
            </span>
            <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              Sesión activa
            </span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas: Ventas | Presupuestos | Remitos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'ventas', label: '🎫 Ventas' },
              { id: 'presupuestos', label: '📄 Presupuestos' },
              { id: 'remitos', label: '🚚 Remitos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDocumentType(tab.id as HistoryDocumentType)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                documentType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtros rápidos por período */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(['hoy', 'semana', 'mes', 'año'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => {
                setActivePeriod(period);
                setCustomDate('');
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg capitalize transition-all whitespace-nowrap ${
                activePeriod === period && !customDate
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
      </div>

      {/* Buscador, Filtro por fecha e Histórico */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Buscador de texto */}
        <div className="flex-1 min-w-[200px] flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Buscar por N° doc, cliente o producto..."
            className="bg-transparent text-slate-900 dark:text-slate-100 text-xs focus:outline-none w-full"
          />
        </div>

        {/* Filtro de Fecha */}
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-slate-100 text-xs focus:outline-none font-mono"
          />
        </div>

        {/* Método de Pago (Ventas / Remitos) */}
        {documentType !== 'presupuestos' && (
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs">
            <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-slate-100 text-xs focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los medios</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Mercado Pago">Mercado Pago</option>
            </select>
          </div>
        )}

        {/* Botones de acción */}
        <Button variant="primary" size="sm" onClick={onSearch} disabled={isLoading} className="h-9 px-4 text-xs font-semibold">
          <Filter className="w-3.5 h-3.5 mr-1.5" /> Filtrar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSearch}
          disabled={isLoading}
          className="h-9 px-3 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          title="Refrescar datos"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
        </Button>
      </div>
    </div>
  );
};
