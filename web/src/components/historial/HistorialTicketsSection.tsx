'use client';

import React from 'react';
import { Ticket, ChevronLeft, ChevronRight, Eye, Printer, ShoppingBag } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { GroupedSaleRecord, PaginatedHistoryResult } from '@/types/history';

interface HistorialTicketsSectionProps {
  paginatedResult: PaginatedHistoryResult<GroupedSaleRecord> | null;
  onPageChange: (page: number) => void;
  onSelectRecord: (record: GroupedSaleRecord) => void;
  isLoading: boolean;
}

export const HistorialTicketsSection: React.FC<HistorialTicketsSectionProps> = ({
  paginatedResult,
  onPageChange,
  onSelectRecord,
  isLoading,
}) => {
  const records = paginatedResult?.data || [];
  const totalPages = paginatedResult?.totalPages || 1;
  const currentPage = paginatedResult?.page || 1;
  const totalCount = paginatedResult?.totalCount || 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Encabezado idéntico a Electron */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Tickets Registrados
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Operaciones registradas en Supabase (Web + Electron)
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">
          {totalCount} {totalCount === 1 ? 'ticket' : 'tickets'}
        </span>
      </div>

      {/* Tabla con estilo y columnas de Electron */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Método de Pago</th>
              <th className="py-3 px-4 text-right">Total ($)</th>
              <th className="py-3 px-4">Productos / Ítems</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900 font-medium">
            {records.length > 0 ? (
              records.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(row.fecha)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Ticket #{row.id}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {row.metodo_pago}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[280px] truncate" title={row.resumenProductos}>
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{row.resumenProductos}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectRecord(row)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>Ver Ticket</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No hay tickets registrados para esta fecha
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      {totalPages > 1 && (
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">
            Página {currentPage} de {totalPages} ({totalCount} tickets totales)
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
            <span className="font-mono text-xs px-2 font-bold">{currentPage}</span>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
