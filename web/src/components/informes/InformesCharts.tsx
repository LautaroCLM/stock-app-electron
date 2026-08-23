'use client';

import React from 'react';
import { PieChart, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CategoryReportItem, PaymentMethodReportItem } from '@/types/report';

interface InformesChartsProps {
  categoryBreakdown: CategoryReportItem[];
  paymentMethodBreakdown: PaymentMethodReportItem[];
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

const PAYMENT_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
];

export const InformesCharts: React.FC<InformesChartsProps> = ({
  categoryBreakdown,
  paymentMethodBreakdown,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Ventas por categoría */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <PieChart className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-slate-100">
            Ventas por categoría
          </h3>
        </div>

        {categoryBreakdown.length > 0 ? (
          <div className="space-y-3 pt-2">
            {categoryBreakdown.slice(0, 6).map((cat, idx) => {
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              return (
                <div key={cat.categoria} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center truncate pr-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${color} mr-2 shrink-0`} />
                      <span className="truncate">{cat.categoria}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-100 shrink-0">
                      {cat.cantidad} u ({cat.porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(3, cat.porcentaje)}%` }}
                      className={`${color} h-full rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            Sin datos de categorías en el período seleccionado.
          </div>
        )}
      </div>

      {/* 2. Métodos de pago */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-slate-100">
            Métodos de pago
          </h3>
        </div>

        {paymentMethodBreakdown.length > 0 ? (
          <div className="space-y-3.5 pt-2">
            {paymentMethodBreakdown.map((pm, idx) => {
              const color = PAYMENT_COLORS[idx % PAYMENT_COLORS.length];
              return (
                <div key={pm.metodo} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${color} mr-2 shrink-0`} />
                      {pm.metodo}
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {formatCurrency(pm.total)} ({pm.porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(3, pm.porcentaje)}%` }}
                      className={`${color} h-full rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            Sin operaciones en el período seleccionado.
          </div>
        )}
      </div>
    </div>
  );
};
