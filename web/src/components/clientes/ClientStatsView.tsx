'use client';

import React from 'react';
import { ClientStats } from '@/types/client';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { DollarSign, Clock, CheckCircle2, TrendingUp, Users, AlertTriangle } from 'lucide-react';

interface ClientStatsViewProps {
  stats: ClientStats | null;
  isLoading: boolean;
}

export const ClientStatsView: React.FC<ClientStatsViewProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Calculando estadísticas de clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Vendido */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Vendido Cta Cte</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatCurrency(stats.totalVendido)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{stats.cantVentas} ventas registradas</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Cobrado */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Cobrado Efectivamente</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatCurrency(stats.totalCobrado)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{stats.cantCobradas} ventas saldadas totalmente</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Pendiente */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo Pendiente por Cobrar</p>
                <h4 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 font-mono">
                  {formatCurrency(stats.totalPendiente)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{stats.cantPendientes} ventas con saldo pendiente</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Deudores Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ranking: Top 5 Clientes con Mayor Deuda Pendiente
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clientes que acumulan el mayor saldo adeudado a la fecha.
            </p>
          </div>
        </div>

        {stats.topDeudores.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            ¡Excelente! Ningún cliente acumula saldo pendiente de pago.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4"># Posición</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Teléfono</th>
                  <th className="py-2.5 px-4 text-right">Monto Adeudado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {stats.topDeudores.map((d, index) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-400">#{index + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{d.nombre}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{d.telefono || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(d.deuda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
