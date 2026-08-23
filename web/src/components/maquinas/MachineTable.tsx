'use client';

import React from 'react';
import { Machine } from '@/types/machine';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Edit2, Trash2, Cog, Clock, Wrench, Fuel } from 'lucide-react';

interface MachineTableProps {
  machines: Machine[];
  isLoading: boolean;
  onEdit: (machine: Machine) => void;
  onDelete: (id: number) => void;
  onOpenWorkLog?: (machine: Machine) => void;
  onOpenFuelLog?: (machine: Machine) => void;
  onOpenMaintenanceLog?: (machine: Machine) => void;
}

export const MachineTable: React.FC<MachineTableProps> = ({
  machines,
  isLoading,
  onEdit,
  onDelete,
  onOpenWorkLog,
  onOpenFuelLog,
  onOpenMaintenanceLog,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando flota de maquinaria desde Supabase...</p>
      </div>
    );
  }

  if (machines.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Cog className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron máquinas registradas</p>
        <p className="text-xs text-slate-400">Intenta cambiar los filtros o registra un nuevo vehículo/equipo pesado.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm custom-scrollbar">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800">
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Máquina / Vehículo</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tipo / Categoría</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Marca / Modelo</TableHead>
            <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Horas Totales</TableHead>
            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Precio/Hora ($)</TableHead>
            <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Último Servicio</TableHead>
            <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Estado</TableHead>
            <TableHead className="text-right sticky right-0 bg-slate-100 dark:bg-slate-800 z-20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {machines.map((machine) => {
            const isDisponible = (machine.estado || 'Disponible') === 'Disponible';
            const isMantenimiento = (machine.estado || '') === 'En Mantenimiento' || machine.estado === 'En mantenimiento';

            return (
              <TableRow key={machine.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                  <div>
                    <span>{machine.nombre}</span>
                    {machine.numero_serie ? (
                      <p className="text-[11px] font-mono font-normal text-slate-400">S/N: {machine.numero_serie}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="text-[11px]">
                    {machine.tipo || 'General'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                  {machine.marca || machine.modelo ? (
                    <span>{machine.marca} {machine.modelo} {machine.anio ? `(${machine.anio})` : ''}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-bold font-mono text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{machine.horas_totales || 0} hs</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold font-mono text-xs text-blue-600 dark:text-blue-400">
                  {formatCurrency(machine.valor_hora || 0)}
                </TableCell>
                <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                  {machine.ultimo_servicio ? formatDate(machine.ultimo_servicio) : '—'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={isDisponible ? 'success' : isMantenimiento ? 'danger' : 'warning'}>
                    {machine.estado || 'Disponible'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-end space-x-1">
                    {onOpenWorkLog && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenWorkLog(machine)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Partes de Trabajo / Horas"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onOpenFuelLog && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenFuelLog(machine)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                        title="Control de Combustible"
                      >
                        <Fuel className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onOpenMaintenanceLog && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenMaintenanceLog(machine)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title="Mantenimiento y Servicios"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(machine)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Editar máquina"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(machine.id)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Eliminar máquina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

