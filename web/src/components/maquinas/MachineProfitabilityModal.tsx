'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MachineProfitability } from '@/types/machine';
import { machineWebService } from '@/lib/services/machineWebService';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, X, RefreshCw, AlertCircle } from 'lucide-react';

interface MachineProfitabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MachineProfitabilityModal: React.FC<MachineProfitabilityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [profitability, setProfitability] = useState<MachineProfitability[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfitability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await machineWebService.getProfitability();
      setProfitability(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener análisis de rentabilidad.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfitability();
    }
  }, [isOpen, fetchProfitability]);

  if (!isOpen) return null;

  const totalIngresos = profitability.reduce((acc, p) => acc + p.ingresos, 0);
  const totalGastoCombustible = profitability.reduce((acc, p) => acc + p.gasto_combustible, 0);
  const totalGastoMantenimiento = profitability.reduce((acc, p) => acc + p.gasto_mantenimiento, 0);
  const totalRentabilidadNeta = totalIngresos - (totalGastoCombustible + totalGastoMantenimiento);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Análisis de Rentabilidad por Máquina
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparativa de ingresos por trabajo vs gastos de combustible y mantenimiento.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchProfitability} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Card Banner */}
        <div className="px-6 py-3 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 grid grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Ingresos</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {formatCurrency(totalIngresos)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Combustible</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              {formatCurrency(totalGastoCombustible)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Mantenimiento</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
              {formatCurrency(totalGastoMantenimiento)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Ganancia Neta</span>
            <span className={`font-mono font-bold text-sm ${totalRentabilidadNeta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalRentabilidadNeta)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Calculando rentabilidad...</span>
            </div>
          ) : profitability.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center">
              <TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sin datos de flota</p>
              <p className="text-[11px] text-slate-400">Registra máquinas y partes de trabajo para visualizar rentabilidad.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Horas Totales</TableHead>
                  <TableHead className="text-right">Ingresos ($)</TableHead>
                  <TableHead className="text-right">Combustible ($)</TableHead>
                  <TableHead className="text-right">Mantenimiento ($)</TableHead>
                  <TableHead className="text-right">Rentabilidad Neta ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitability.map((p) => {
                  const isPositive = p.rentabilidad_neta >= 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {p.nombre}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {p.tipo || 'General'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {p.horas_totales} hs
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(p.ingresos)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        {formatCurrency(p.gasto_combustible)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                        {formatCurrency(p.gasto_mantenimiento)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(p.rentabilidad_neta)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
