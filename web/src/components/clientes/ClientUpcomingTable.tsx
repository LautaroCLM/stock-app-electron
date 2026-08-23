'use client';

import React from 'react';
import { ClientSale } from '@/types/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CalendarCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ClientUpcomingTableProps {
  sales: ClientSale[];
  isLoading: boolean;
  onViewDetail: (sale: ClientSale) => void;
}

export const ClientUpcomingTable: React.FC<ClientUpcomingTableProps> = ({
  sales,
  isLoading,
  onViewDetail,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Cargando próximos cobros...</p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center mb-3">
          <CalendarCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">¡Al día! Sin cobros pendientes</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          No hay ventas con saldo pendiente de cobro registradas.
        </p>
      </div>
    );
  }

  const getDaysRemaining = (fechaCobroStr?: string) => {
    if (!fechaCobroStr) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dateParts = fechaCobroStr.split('T')[0].split('-');
    if (dateParts.length !== 3) return null;
    const vto = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    return Math.round((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderStatusBadge = (dias: number | null) => {
    if (dias === null) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          Sin fecha
        </span>
      );
    }
    if (dias < 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          Vencido hace {Math.abs(dias)} días
        </span>
      );
    }
    if (dias === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 animate-pulse">
          Vence Hoy
        </span>
      );
    }
    if (dias <= 5) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          Vence en {dias} días
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        Próximo ({dias} días)
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Fecha Estimada</th>
              <th className="py-3 px-4"># Venta</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Total Venta</th>
              <th className="py-3 px-4">Saldo Pendiente</th>
              <th className="py-3 px-4">Estado Vencimiento</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            {sales.map((s) => {
              const dias = getDaysRemaining(s.fecha_estimada_cobro);
              return (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                    {s.fecha_estimada_cobro ? formatDate(s.fecha_estimada_cobro) : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">#{s.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {s.cliente_nombre}
                  </td>
                  <td className="py-3.5 px-4 font-mono">{formatCurrency(s.total)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(s.saldo_pendiente)}
                  </td>
                  <td className="py-3.5 px-4">{renderStatusBadge(dias)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(s)}
                      title="Ver detalle y registrar cobro"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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
