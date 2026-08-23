'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Machine, MachineFuelLog } from '@/types/machine';
import { machineWebService } from '@/lib/services/machineWebService';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Fuel, X, Trash2, RefreshCw, AlertCircle, Plus } from 'lucide-react';

interface MachineFuelLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onRefreshParent: () => void;
}

export const MachineFuelLogModal: React.FC<MachineFuelLogModalProps> = ({
  isOpen,
  onClose,
  machine,
  onRefreshParent,
}) => {
  const [logs, setLogs] = useState<MachineFuelLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fecha, setFecha] = useState<string>('');
  const [litros, setLitros] = useState<string>('');
  const [precioLitro, setPrecioLitro] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    if (!machine) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await machineWebService.getFuelLogs(machine.id);
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener cargas de combustible.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [machine]);

  useEffect(() => {
    if (isOpen && machine) {
      fetchLogs();
      setFecha(new Date().toISOString().split('T')[0]);
      setLitros('');
      setPrecioLitro('');
      setObservaciones('');
    }
  }, [isOpen, machine, fetchLogs]);

  if (!isOpen || !machine) return null;

  const handleAddFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!litros || parseFloat(litros) <= 0) {
      setError('Los litros deben ser mayores a 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const l = parseFloat(litros);
      const p = parseFloat(precioLitro) || 0;
      await machineWebService.createFuelLog({
        maquina_id: machine.id,
        fecha: fecha || new Date().toISOString().split('T')[0],
        litros: l,
        precio_litro: p,
        total: l * p,
        observaciones,
      });

      setLitros('');
      setPrecioLitro('');
      setObservaciones('');
      await fetchLogs();
      onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar combustible.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFuelLog = async (logId: number) => {
    if (!confirm('¿Eliminar esta carga de combustible?')) return;

    try {
      setError(null);
      await machineWebService.deleteFuelLog(logId);
      await fetchLogs();
      onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar registro de combustible.';
      setError(msg);
    }
  };

  const totalLitros = logs.reduce((acc, l) => acc + Number(l.litros || 0), 0);
  const totalGastoCombustible = logs.reduce((acc, l) => acc + Number(l.total || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Control de Combustible — {machine.nombre}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {machine.tipo} — {machine.marca} {machine.modelo}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Banner */}
        <div className="px-6 py-3 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Litros Cargados</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
              {totalLitros.toFixed(1)} L
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Gasto Total Combustible</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              {formatCurrency(totalGastoCombustible)}
            </span>
          </div>
        </div>

        {/* Form and List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form to Register Fuel */}
          <form onSubmit={handleAddFuelLog} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-amber-500" />
              <span>Registrar Carga de Combustible</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Litros <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Ej: 50"
                  value={litros}
                  onChange={(e) => setLitros(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Precio por Litro ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precioLitro}
                  onChange={(e) => setPrecioLitro(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observaciones / Estación de Servicio
              </label>
              <input
                type="text"
                placeholder="Ej: Carga Shell Central..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Agregar Carga'}
              </Button>
            </div>
          </form>

          {/* Logs List */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">Historial de Cargas de Combustible</h4>
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Cargando registros...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400">No hay cargas de combustible registradas para esta máquina.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Litros</TableHead>
                    <TableHead className="text-right">Precio/Litro</TableHead>
                    <TableHead className="text-right">Total ($)</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatDate(l.fecha)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {l.litros} L
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatCurrency(l.precio_litro)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(l.total)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {l.observaciones || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFuelLog(l.id)}
                          className="p-1 hover:text-red-600 dark:hover:text-red-400"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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
