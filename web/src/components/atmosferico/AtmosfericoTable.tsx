'use client';

import React from 'react';
import { AtmosfericoService } from '@/types/atmosferico';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Edit2, Trash2, Truck, DollarSign } from 'lucide-react';

interface AtmosfericoTableProps {
  services: AtmosfericoService[];
  isLoading: boolean;
  onEdit: (service: AtmosfericoService) => void;
  onDelete: (id: number) => void;
  onManagePayments?: (service: AtmosfericoService) => void;
}

export const AtmosfericoTable: React.FC<AtmosfericoTableProps> = ({
  services,
  isLoading,
  onEdit,
  onDelete,
  onManagePayments,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando servicios atmosféricos...</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Truck className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No hay servicios registrados</p>
        <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o registra un nuevo servicio.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm custom-scrollbar">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800">
            <TableHead className="w-20 font-bold text-slate-700 dark:text-slate-300">Número</TableHead>
            <TableHead className="w-28 font-bold text-slate-700 dark:text-slate-300">Fecha</TableHead>
            <TableHead className="w-auto min-w-[180px] font-bold text-slate-700 dark:text-slate-300">Cliente / Organismo</TableHead>
            <TableHead className="w-36 font-bold text-slate-700 dark:text-slate-300">Dirección</TableHead>
            <TableHead className="w-40 font-bold text-slate-700 dark:text-slate-300">Servicio y Descripción</TableHead>
            <TableHead className="w-28 text-right font-bold text-slate-700 dark:text-slate-300">Total</TableHead>
            <TableHead className="w-28 text-right font-bold text-slate-700 dark:text-slate-300">Saldo Pendiente</TableHead>
            <TableHead className="w-28 font-bold text-slate-700 dark:text-slate-300">Fecha Est. Cobro</TableHead>
            <TableHead className="w-28 text-center font-bold text-slate-700 dark:text-slate-300">Estado</TableHead>
            <TableHead className="w-28 text-right sticky right-0 bg-slate-100 dark:bg-slate-800 z-20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.08)] font-bold">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const isCobrado = (service.estado || 'Pendiente') === 'Cobrado';
            const isParcial = (service.estado || 'Pendiente') === 'Pago parcial';

            return (
              <TableRow key={service.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                {/* 1. Número */}
                <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  #{service.id}
                </TableCell>

                {/* 2. Fecha */}
                <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {formatDate(service.fecha)}
                </TableCell>

                {/* 3. Cliente / Organismo */}
                <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                  <div>
                    <span>{service.cliente}</span>
                    {service.telefono ? (
                      <p className="text-[11px] font-mono font-normal text-slate-400 mt-0.5">Tel: {service.telefono}</p>
                    ) : null}
                  </div>
                </TableCell>

                {/* 4. Dirección */}
                <TableCell className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {service.direccion || '—'}
                </TableCell>

                {/* 5. Servicio y Descripción */}
                <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-0.5">
                      {service.tipo_servicio || 'Desagote'}
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{service.descripcion || '—'}</p>
                    {service.observaciones ? (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{service.observaciones}</p>
                    ) : null}
                  </div>
                </TableCell>

                {/* 6. Total */}
                <TableCell className="text-right font-bold font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {formatCurrency(service.monto || 0)}
                </TableCell>

                {/* 7. Saldo Pendiente */}
                <TableCell className="text-right font-bold font-mono text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {formatCurrency(service.saldo_pendiente ?? service.monto ?? 0)}
                </TableCell>

                {/* 8. Fecha Est. Cobro */}
                <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {service.fecha_estimada_cobro ? formatDate(service.fecha_estimada_cobro) : '—'}
                </TableCell>

                {/* 9. Estado */}
                <TableCell className="text-center whitespace-nowrap">
                  <Badge
                    variant={isCobrado ? 'success' : isParcial ? 'warning' : 'danger'}
                    className="font-bold text-[10px] tracking-wider uppercase"
                  >
                    {service.estado || 'Pendiente'}
                  </Badge>
                </TableCell>

                {/* 10. Acciones (Sticky) */}
                <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-slate-200 dark:border-slate-800 shadow-[-4px_0px_6px_-2px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-end space-x-1">
                    {onManagePayments && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onManagePayments(service)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                        title="Registrar / Ver Cobros"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(service)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Editar servicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(service.id)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Eliminar servicio"
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

