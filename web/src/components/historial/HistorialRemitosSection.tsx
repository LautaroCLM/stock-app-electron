'use client';

import React from 'react';
import { Truck, ChevronLeft, ChevronRight, Eye, PackageCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RemitoHistoryRecord, PaginatedHistoryResult } from '@/types/history';

interface HistorialRemitosSectionProps {
  paginatedResult: PaginatedHistoryResult<RemitoHistoryRecord> | null;
  onPageChange: (page: number) => void;
  onSelectRecord: (record: RemitoHistoryRecord) => void;
  isLoading: boolean;
}

export const HistorialRemitosSection: React.FC<HistorialRemitosSectionProps> = ({
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
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Historial de Remitos Emitidos
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Comprobantes de entrega registrados en Supabase (Web + Electron)
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-semibold">
          {totalCount} {totalCount === 1 ? 'remito' : 'remitos'}
        </span>
      </div>

      {/* Tabla con estilo y columnas de Electron */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[11px] border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Número</th>
              <th className="py-3 px-4">Cliente / Señor(es)</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Domicilio</th>
              <th className="py-3 px-4">Vendedor</th>
              <th className="py-3 px-4">Productos</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900 font-medium">
            {records.length > 0 ? (
              records.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {row.numeroFormatted}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[160px] truncate" title={row.cliente}>
                    {row.cliente}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(row.fecha)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={row.direccion || '—'}>
                    {row.direccion || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {row.vendedor || 'Administrador'}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[240px] truncate" title={row.resumenProductos}>
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{row.resumenProductos}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectRecord(row)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-500" />
                      <span>Ver / Imprimir</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No hay remitos registrados para esta fecha
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
            Página {currentPage} de {totalPages} ({totalCount} remitos totales)
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
