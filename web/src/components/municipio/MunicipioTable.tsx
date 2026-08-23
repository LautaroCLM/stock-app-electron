'use client';

import React from 'react';
import { MunicipioOrder } from '@/types/municipio';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Edit2, Trash2, Building2, Calendar, FileText, DollarSign } from 'lucide-react';

interface MunicipioTableProps {
  orders: MunicipioOrder[];
  isLoading: boolean;
  onEdit: (order: MunicipioOrder) => void;
  onDelete: (id: number) => void;
  onManagePayments?: (order: MunicipioOrder) => void;
}

export const MunicipioTable: React.FC<MunicipioTableProps> = ({
  orders,
  isLoading,
  onEdit,
  onDelete,
  onManagePayments,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando órdenes municipales desde Supabase...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Building2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron órdenes municipales</p>
        <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o registra una nueva orden.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Expediente / Orden</TableHead>
          <TableHead>Fecha Est. Cobro</TableHead>
          <TableHead className="text-right">Total ($)</TableHead>
          <TableHead className="text-right">Saldo Pendiente ($)</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead>Observaciones</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const isCobrado = (order.estado || 'Pendiente') === 'Cobrado';
          const isParcial = (order.estado || 'Pendiente') === 'Pago parcial';

          return (
            <TableRow key={order.id}>
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{formatDate(order.fecha)}</span>
                </div>
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{order.expediente || order.orden_compra || `Orden #${order.id}`}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                {order.fecha_estimada_cobro ? formatDate(order.fecha_estimada_cobro) : '-'}
              </TableCell>
              <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                {formatCurrency(order.total || 0)}
              </TableCell>
              <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400 font-mono">
                {formatCurrency(order.saldo_pendiente ?? order.total ?? 0)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={isCobrado ? 'success' : isParcial ? 'warning' : 'danger'}>
                  {order.estado || 'Pendiente'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                {order.observaciones || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  {onManagePayments && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManagePayments(order)}
                      className="p-1.5 hover:text-emerald-600 dark:hover:text-emerald-400"
                      title="Registrar / Ver Cobros"
                    >
                      <DollarSign className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(order)}
                    className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Editar orden"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(order.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                    title="Eliminar orden"
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

