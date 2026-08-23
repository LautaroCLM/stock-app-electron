'use client';

import React from 'react';
import { Budget } from '@/types/budget';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Edit2, Trash2, Calendar, FileText, User } from 'lucide-react';

interface BudgetTableProps {
  budgets: Budget[];
  isLoading: boolean;
  onEdit: (budget: Budget) => void;
  onDelete: (id: number) => void;
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  budgets,
  isLoading,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando presupuestos desde Supabase...</p>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron presupuestos</p>
        <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o genera una nueva cotización.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>N° Presupuesto</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Subtotal ($)</TableHead>
          <TableHead className="text-right">Total Final ($)</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>Observaciones</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {budgets.map((budget) => {
          const isAprobado = (budget.estado || 'Pendiente') === 'Aprobado';
          const isRechazado = (budget.estado || '') === 'Rechazado';

          return (
            <TableRow key={budget.id}>
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{formatDate(budget.fecha)}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                #{budget.id}
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{budget.cliente || 'Cliente General'}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                {formatCurrency(budget.subtotal || budget.total || 0)}
              </TableCell>
              <TableCell className="text-right font-bold font-mono text-blue-600 dark:text-blue-400 text-sm">
                {formatCurrency(budget.total || 0)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={isAprobado ? 'success' : isRechazado ? 'danger' : 'warning'}>
                  {budget.estado || 'Pendiente'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                {budget.observaciones || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(budget)}
                    className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Editar presupuesto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(budget.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                    title="Eliminar presupuesto"
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
