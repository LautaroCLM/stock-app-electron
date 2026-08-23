'use client';

import React, { useState, useEffect } from 'react';
import { ExpenseStats } from '@/types/expense';
import { expenseWebService } from '@/lib/services/expenseWebService';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { PieChart, DollarSign, Calendar, AlertCircle, TrendingDown, Layers } from 'lucide-react';

interface ExpenseStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseStatsModal: React.FC<ExpenseStatsModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      expenseWebService
        .getExpenseStats()
        .then((data) => setStats(data))
        .catch((err) => {
          console.error(err);
          setError(err.message || 'Error al obtener estadísticas de gastos.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Análisis y Estadísticas de Gastos"
      description="Desglose consolidado de egresos por categorías, mes actual y estados de pago."
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Procesando estadísticas...</span>
          </div>
        ) : stats ? (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Histórico</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
                  {formatCurrency(stats.totalHistorico)}
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Gastos del Mes</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono mt-1">
                  {formatCurrency(stats.gastoMesActual)}
                </p>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl">
                <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">Pendiente de Pago</p>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono mt-1">
                  {formatCurrency(stats.gastoPendiente)}
                </p>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-rose-500" />
                <span>Gastos por Categoría</span>
              </h4>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Categoría</th>
                      <th className="p-3 text-center">Registros</th>
                      <th className="p-3 text-right">Monto Acumulado</th>
                      <th className="p-3 text-right">% Participación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {stats.porCategoria.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">
                          No hay gastos registrados para analizar.
                        </td>
                      </tr>
                    ) : (
                      stats.porCategoria.map((item) => (
                        <tr key={item.categoria} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                            <span>{item.categoria}</span>
                          </td>
                          <td className="p-3 text-center font-mono">{item.cantidad}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-rose-500 h-full rounded-full"
                                  style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] w-10 text-right">{item.porcentaje}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
