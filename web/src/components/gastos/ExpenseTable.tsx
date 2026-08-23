'use client';

import React from 'react';
import { Expense } from '@/types/expense';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Edit2, Trash2, Wallet, Calendar, Tag } from 'lucide-react';

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  isLoading,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando registro de gastos desde Supabase...</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Wallet className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron gastos</p>
        <p className="text-xs text-slate-400">Intenta cambiar los filtros o registra un nuevo gasto operativo.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Concepto / Descripción</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead className="text-right">Monto ($)</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>Observaciones</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const isPaid = (expense.estado || 'Pagado') === 'Pagado';

          return (
            <TableRow key={expense.id}>
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{formatDate(expense.fecha)}</span>
                </div>
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                {expense.concepto}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <Badge variant="default" className="text-[11px]">
                    {expense.categoria || 'General'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(expense.monto || 0)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={isPaid ? 'success' : 'warning'}>
                  {expense.estado || 'Pagado'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                {expense.observacion || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(expense)}
                    className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Editar gasto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(expense.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                    title="Eliminar gasto"
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
