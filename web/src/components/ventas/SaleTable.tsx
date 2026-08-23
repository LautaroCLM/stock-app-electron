'use client';

import React from 'react';
import { Sale } from '@/types/sale';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Trash2, ShoppingCart, Calendar, User, CreditCard } from 'lucide-react';

interface SaleTableProps {
  sales: Sale[];
  isLoading: boolean;
  onDelete: (id: number) => void;
}

export const SaleTable: React.FC<SaleTableProps> = ({
  sales,
  isLoading,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando historial de ventas desde Supabase...</p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron ventas registradas</p>
        <p className="text-xs text-slate-400">Intenta cambiar los filtros de búsqueda o realiza una nueva venta.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha / Hora</TableHead>
          <TableHead>N° Venta</TableHead>
          <TableHead>Producto / Ítem</TableHead>
          <TableHead className="text-center">Cantidad</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Método de Pago</TableHead>
          <TableHead className="text-right">Total ($)</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => {
          return (
            <TableRow key={sale.id}>
              <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{formatDate(sale.fecha)}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                #{sale.id}
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                {sale.producto_nombre || 'Venta General'}
              </TableCell>
              <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300">
                {sale.cantidad}
              </TableCell>
              <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{sale.cliente || 'Consumidor Final'}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <Badge variant="info" className="text-[11px]">
                    {sale.metodo_pago || 'Efectivo'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                {formatCurrency(sale.total || 0)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(sale.id)}
                  className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                  title="Anular / Eliminar venta"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
