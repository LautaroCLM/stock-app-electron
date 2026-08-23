'use client';

import React from 'react';
import { PayrollRecord } from '@/types/payroll';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Edit2, Trash2, Calendar, Receipt, Clock } from 'lucide-react';

interface PayrollTableProps {
  payrolls: PayrollRecord[];
  isLoading: boolean;
  onEdit: (payroll: PayrollRecord) => void;
  onDelete: (id: number) => void;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  payrolls,
  isLoading,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando recibos de liquidación desde Supabase...</p>
      </div>
    );
  }

  if (payrolls.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Receipt className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron liquidaciones de sueldo</p>
        <p className="text-xs text-slate-400">Genera una nueva liquidación mensual para los empleados.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Período (Mes)</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead className="text-center">Horas Trabajadas</TableHead>
          <TableHead className="text-right">Valor Hora ($)</TableHead>
          <TableHead className="text-right">Adicionales ($)</TableHead>
          <TableHead className="text-right">Descuentos ($)</TableHead>
          <TableHead className="text-right">Total Liquidado ($)</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payrolls.map((p) => {
          return (
            <TableRow key={p.id}>
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-bold">{p.mes}</span>
                </div>
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                {p.empleado_nombre}
              </TableCell>
              <TableCell className="text-center font-bold font-mono text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.horas_trabajadas || 0} hs</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                {formatCurrency(p.valor_hora || 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(p.adicionales || 0)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                -{formatCurrency(p.descuentos || 0)}
              </TableCell>
              <TableCell className="text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(p.total_liquidacion || 0)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(p)}
                    className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Editar liquidación"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(p.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                    title="Eliminar recibo de liquidación"
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
