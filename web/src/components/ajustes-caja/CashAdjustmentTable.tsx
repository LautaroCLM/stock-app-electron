'use client';

import React from 'react';
import { CashAdjustment } from '@/types/cashAdjustment';
import { formatCurrency } from '@/lib/utils';
import { Trash2, ShoppingBag, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

interface CashAdjustmentTableProps {
  adjustments: CashAdjustment[];
  isLoading: boolean;
  onDelete: (id: number) => void;
}

export const CashAdjustmentTable: React.FC<CashAdjustmentTableProps> = ({
  adjustments,
  isLoading,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-400 font-medium">Cargando registros de ajustes de caja...</span>
      </div>
    );
  }

  if (adjustments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <Info className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          No se encontraron movimientos ni ajustes de caja registrados.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split(' ');
      const datePart = parts[0].split('-').reverse().join('/');
      const timePart = parts[1] ? ` ${parts[1].substring(0, 5)}` : '';
      return `${datePart}${timePart}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3.5">Fecha</th>
              <th className="px-4 py-3.5">Tipo</th>
              <th className="px-4 py-3.5">Motivo</th>
              <th className="px-4 py-3.5 text-right">Monto</th>
              <th className="px-4 py-3.5 text-center">Venta Asociada</th>
              <th className="px-4 py-3.5">Observaciones</th>
              <th className="px-4 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {adjustments.map((a) => {
              const isPositivo = (a.monto || 0) >= 0;
              const absMonto = Math.abs(a.monto || 0);

              return (
                <tr
                  key={a.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Fecha */}
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(a.fecha)}
                  </td>

                  {/* Tipo Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        isPositivo
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
                      }`}
                    >
                      {isPositivo ? (
                        <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1 text-rose-500" />
                      )}
                      {a.tipo}
                    </span>
                  </td>

                  {/* Motivo */}
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {a.motivo}
                  </td>

                  {/* Monto */}
                  <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold">
                    <span className={isPositivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {isPositivo ? '+' : '-'}{formatCurrency(absMonto)}
                    </span>
                  </td>

                  {/* Venta Asociada */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {a.venta_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                        <ShoppingBag className="w-3 h-3 mr-1" />
                        #{a.venta_id}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Observaciones */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    {a.observacion || '—'}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onDelete(a.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Eliminar ajuste"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
