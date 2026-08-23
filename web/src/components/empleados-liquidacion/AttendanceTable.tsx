'use client';

import React from 'react';
import { Attendance } from '@/types/payroll';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { Edit2, Trash2, Calendar, Clock, UserCheck } from 'lucide-react';

interface AttendanceTableProps {
  attendances: Attendance[];
  isLoading: boolean;
  onEdit: (att: Attendance) => void;
  onDelete: (id: number) => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  attendances,
  isLoading,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando registros de asistencia desde Supabase...</p>
      </div>
    );
  }

  if (attendances.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <UserCheck className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron asistencias registradas</p>
        <p className="text-xs text-slate-400">Selecciona otro período de búsqueda o marca una nueva asistencia.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead className="text-center">Hora Entrada</TableHead>
          <TableHead className="text-center">Hora Salida</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>Observaciones</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attendances.map((att) => {
          const isPresente = (att.estado || 'Presente') === 'Presente';
          const isAusente = (att.estado || '') === 'Ausente';
          const isTarde = (att.estado || '') === 'Tarde';

          return (
            <TableRow key={att.id}>
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{formatDate(att.fecha)}</span>
                </div>
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                {att.empleado_nombre}
              </TableCell>
              <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                {att.hora_entrada ? (
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{att.hora_entrada}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                {att.hora_salida ? (
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{att.hora_salida}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={isPresente ? 'success' : isAusente ? 'danger' : isTarde ? 'warning' : 'info'}>
                  {att.estado || 'Presente'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                {att.observaciones || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(att)}
                    className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Editar asistencia"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(att.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                    title="Eliminar asistencia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
