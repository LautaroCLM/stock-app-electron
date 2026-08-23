'use client';

import React from 'react';
import { ClientSale } from '@/types/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Eye, Trash2, Tag } from 'lucide-react';

interface ClientSalesTableProps {
  sales: ClientSale[];
  isLoading: boolean;
  onViewDetail: (sale: ClientSale) => void;
  onDelete: (id: number) => void;
}

export const ClientSalesTable: React.FC<ClientSalesTableProps> = ({
  sales,
  isLoading,
  onViewDetail,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Cargando ventas a cuenta corriente...</p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Tag className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Sin ventas a cuenta corriente</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          No se encontraron ventas que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  const renderBadge = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'cobrado') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
          Cobrado
        </span>
      );
    }
    if (est === 'pago parcial') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
          Pago parcial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
        Pendiente
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4"># Venta</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Comprobante</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Estimado Cobro</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Saldo Pendiente</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            {sales.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                  #{s.id}
                </td>
                <td className="py-3.5 px-4">{formatDate(s.fecha)}</td>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  {s.cliente_nombre || `Cliente #${s.cliente_id}`}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{s.comprobante || '—'}</div>
                  {s.observaciones ? (
                    <div className="text-[11px] text-slate-400 line-clamp-1">{s.observaciones}</div>
                  ) : null}
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {formatCurrency(s.total)}
                </td>
                <td className="py-3.5 px-4">{s.fecha_estimada_cobro ? formatDate(s.fecha_estimada_cobro) : '—'}</td>
                <td className="py-3.5 px-4">{renderBadge(s.estado)}</td>
                <td className={`py-3.5 px-4 font-bold font-mono ${s.saldo_pendiente > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(s.saldo_pendiente)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(s)}
                      title="Ver detalle y cobros"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(s.id)}
                      title="Eliminar venta"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
