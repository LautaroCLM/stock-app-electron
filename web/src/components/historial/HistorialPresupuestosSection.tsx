'use client';

import React from 'react';
import { FileText, ChevronLeft, ChevronRight, Eye, FileCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PresupuestoHistoryRecord, PaginatedHistoryResult } from '@/types/history';

interface HistorialPresupuestosSectionProps {
  paginatedResult: PaginatedHistoryResult<PresupuestoHistoryRecord> | null;
  onPageChange: (page: number) => void;
  onSelectRecord: (record: PresupuestoHistoryRecord) => void;
  isLoading: boolean;
}

export const HistorialPresupuestosSection: React.FC<HistorialPresupuestosSectionProps> = ({
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
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Historial de Presupuestos
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cotizaciones emitidas en Supabase (Web + Electron)
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">
          {totalCount} {totalCount === 1 ? 'presupuesto' : 'presupuestos'}
        </span>
      </div>

      {/* Tabla con estilo y columnas de Electron */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Número</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4 text-right">Total ($)</th>
              <th className="py-3 px-4">Productos / Detalle</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900 font-medium">
            {records.length > 0 ? (
              records.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    {row.numeroFormatted}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[160px] truncate" title={row.cliente}>
                    {row.cliente}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(row.fecha)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[280px] truncate" title={row.resumenProductos}>
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">{row.resumenProductos}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectRecord(row)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-500" />
                      <span>Ver / Imprimir</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No hay presupuestos registrados para esta fecha
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
            Página {currentPage} de {totalPages} ({totalCount} presupuestos totales)
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
