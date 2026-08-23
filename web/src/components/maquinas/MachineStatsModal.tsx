'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MachineStats } from '@/types/machine';
import { machineWebService } from '@/lib/services/machineWebService';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { BarChart2, X, RefreshCw, AlertCircle, Cog, CheckCircle, Wrench, Fuel, DollarSign, Clock } from 'lucide-react';

interface MachineStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MachineStatsModal: React.FC<MachineStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<MachineStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await machineWebService.getStats();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener estadísticas.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Estadísticas del Parque Automotor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resumen mensual de disponibilidad, horas de uso e inversiones en la flota.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Cargando estadísticas...</span>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Disponibilidad de Flota</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total de Flota</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                        {stats.totalMaquinas}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Cog className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Máquinas Disponibles</p>
                      <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                        {stats.disponibles}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">En Mantenimiento</p>
                      <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                        {stats.enMantenimiento}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <Wrench className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 pt-2">Métricas del Mes en Curso</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Horas Trabajadas</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-blue-500 mr-1" />
                      <span>{stats.horasMes} hs</span>
                    </h4>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Ingresos Generados</p>
                    <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-emerald-500 mr-1" />
                      <span>{formatCurrency(stats.ingresosMes)}</span>
                    </h4>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gasto Combustible</p>
                    <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono flex items-center space-x-1">
                      <Fuel className="w-4 h-4 text-amber-500 mr-1" />
                      <span>{formatCurrency(stats.gastoComb)}</span>
                    </h4>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gasto Mantenimiento</p>
                    <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono flex items-center space-x-1">
                      <Wrench className="w-4 h-4 text-rose-500 mr-1" />
                      <span>{formatCurrency(stats.gastoMant)}</span>
                    </h4>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
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
