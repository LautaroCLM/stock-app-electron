'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Machine, MachineMaintenanceLog } from '@/types/machine';
import { machineWebService } from '@/lib/services/machineWebService';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Wrench, X, Trash2, RefreshCw, AlertCircle, Plus } from 'lucide-react';

interface MachineMaintenanceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onRefreshParent: () => void;
}

export const MachineMaintenanceLogModal: React.FC<MachineMaintenanceLogModalProps> = ({
  isOpen,
  onClose,
  machine,
  onRefreshParent,
}) => {
  const [logs, setLogs] = useState<MachineMaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fecha, setFecha] = useState<string>('');
  const [tipo, setTipo] = useState<string>('Preventivo');
  const [descripcion, setDescripcion] = useState<string>('');
  const [costo, setCosto] = useState<string>('');
  const [taller, setTaller] = useState<string>('');
  const [estado, setEstado] = useState<string>('Realizado');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    if (!machine) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await machineWebService.getMaintenanceLogs(machine.id);
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener mantenimientos.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [machine]);

  useEffect(() => {
    if (isOpen && machine) {
      fetchLogs();
      setFecha(new Date().toISOString().split('T')[0]);
      setTipo('Preventivo');
      setDescripcion('');
      setCosto('');
      setTaller('');
      setEstado('Realizado');
    }
  }, [isOpen, machine, fetchLogs]);

  if (!isOpen || !machine) return null;

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError('La descripción del mantenimiento es obligatoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await machineWebService.createMaintenanceLog({
        maquina_id: machine.id,
        fecha: fecha || new Date().toISOString().split('T')[0],
        tipo,
        descripcion: descripcion.trim(),
        costo: parseFloat(costo) || 0,
        taller: taller.trim(),
        estado,
      });

      setDescripcion('');
      setCosto('');
      setTaller('');
      await fetchLogs();
      onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar mantenimiento.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaintenance = async (logId: number) => {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return;

    try {
      setError(null);
      await machineWebService.deleteMaintenanceLog(logId);
      await fetchLogs();
      onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar mantenimiento.';
      setError(msg);
    }
  };

  const totalMantenimiento = logs.reduce((acc, l) => acc + Number(l.costo || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Historial de Mantenimiento — {machine.nombre}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {machine.tipo} — ÚLTIMO SERVICIO: {machine.ultimo_servicio ? formatDate(machine.ultimo_servicio) : 'Ninguno'}
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
            <span className="text-slate-500 dark:text-slate-400 block">Servicios Registrados</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
              {logs.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Gasto Total Mantenimiento</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
              {formatCurrency(totalMantenimiento)}
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

          {/* Form to Register Maintenance */}
          <form onSubmit={handleAddMaintenance} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-rose-500" />
              <span>Registrar Mantenimiento / Reparación</span>
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Servicio
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Reparación">Reparación</option>
                  <option value="Service General">Service General</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Realizado">Realizado</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En proceso">En proceso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción del Trabajo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de aceite, filtros y fluidos hidráulicos..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Costo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taller / Mecánico
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Taller Central"
                    value={taller}
                    onChange={(e) => setTaller(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Agregar Mantenimiento'}
              </Button>
            </div>
          </form>

          {/* Logs List */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">Historial de Mantenimientos</h4>
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Cargando mantenimientos...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400">No hay registros de mantenimiento para esta máquina.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Taller</TableHead>
                    <TableHead className="text-right">Costo ($)</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatDate(l.fecha)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {l.tipo}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {l.descripcion}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {l.taller || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(l.costo)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={l.estado === 'Realizado' ? 'success' : 'warning'}>
                          {l.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMaintenance(l.id)}
                          className="p-1 hover:text-red-600 dark:hover:text-red-400"
                          title="Eliminar mantenimiento"
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
