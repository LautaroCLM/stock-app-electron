'use client';

import React from 'react';
import { FinancialTransaction, PaymentMethodMetric } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, CreditCard, History } from 'lucide-react';

interface FinanceRecentTableProps {
  transactions: FinancialTransaction[];
  paymentMethods: PaymentMethodMetric[];
  isLoading: boolean;
}

export const FinanceRecentTable: React.FC<FinanceRecentTableProps> = ({
  transactions,
  paymentMethods,
  isLoading,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Transacciones y Movimientos Recientes (2 columnas) */}
      <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <History className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Movimientos Recientes
          </h3>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="text-[11px] uppercase font-bold tracking-wider bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">FECHA</th>
                <th className="p-3">CONCEPTO / CLIENTE</th>
                <th className="p-3 text-center">TIPO</th>
                <th className="p-3 text-right">MONTO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    Cargando transacciones recientes...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50">
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {tx.fecha ? tx.fecha.substring(0, 10) : '-'}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {tx.concepto}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {tx.tipo === 'ingreso' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                          <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          Ingreso
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800">
                          <ArrowDownLeft className="w-3 h-3 mr-0.5" />
                          Egreso
                        </span>
                      )}
                    </td>
                    <td className={`p-3 text-right font-bold font-mono whitespace-nowrap ${
                      tx.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(tx.monto)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    No hay movimientos registrados recientemente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Distribución de Métodos de Pago (1 columna) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <CreditCard className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Métodos de Pago
          </h3>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-slate-400 text-center py-4">Cargando métodos de pago...</p>
          ) : paymentMethods.length > 0 ? (
            paymentMethods.map((pm) => (
              <div key={pm.metodo} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{pm.metodo}</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {formatCurrency(pm.total)} ({pm.porcentaje}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pm.porcentaje}%` }}
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">Sin registros de pago este mes.</p>
          )}
        </div>
      </div>
    </div>
  );
};
