'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AtmosfericoStats } from '@/types/atmosferico';
import { atmosfericoWebService } from '@/lib/services/atmosfericoWebService';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { BarChart2, X, RefreshCw, AlertCircle, DollarSign, HandCoins, AlertTriangle, FileText, Clock, CheckCheck } from 'lucide-react';

interface AtmosfericoStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AtmosfericoStatsModal: React.FC<AtmosfericoStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<AtmosfericoStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await atmosfericoWebService.getStats();
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
                Estadísticas de Servicios Atmosféricos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Métricas globales de facturación, recaudación y estado de servicios.
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
              <span className="text-xs text-slate-400 font-medium">Cargando métricas...</span>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Facturado</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                        {formatCurrency(stats.totalVendido)}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Cobrado</p>
                      <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                        {formatCurrency(stats.totalCobrado)}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <HandCoins className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Pendiente</p>
                      <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                        {formatCurrency(stats.totalPendiente)}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cantidad de Servicios</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                        {stats.cantOrdenes}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Servicios Pendientes</p>
                      <h4 className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1 font-mono">
                        {stats.cantPendientes}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Servicios Cobrados</p>
                      <h4 className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1 font-mono">
                        {stats.cantCobradas}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <CheckCheck className="w-5 h-5" />
                    </div>
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
