'use client';

import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Clock, Tag, AlignLeft, Inbox } from 'lucide-react';

export interface AuditRecord {
  id: string | number;
  fecha: string;
  accion: string;
  detalle: string;
}

interface HistorialMainTableProps {
  records: AuditRecord[];
  isLoading?: boolean;
}

export const HistorialMainTable: React.FC<HistorialMainTableProps> = ({
  records,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Cargando registros de historial...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-300">No hay registros para esta fecha</p>
        <p className="text-xs text-slate-500">Selecciona otra fecha o realiza nuevas operaciones en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-800 bg-slate-950/80">
            <TableHead className="w-[180px] text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Fecha</span>
              </span>
            </TableHead>
            <TableHead className="w-[180px] text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span>Acción</span>
              </span>
            </TableHead>
            <TableHead className="text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
                <span>Detalle</span>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((rec) => {
            const isVenta = rec.accion.toLowerCase().includes('venta');
            const isStock = rec.accion.toLowerCase().includes('stock') || rec.accion.toLowerCase().includes('producto');
            const isGasto = rec.accion.toLowerCase().includes('gasto') || rec.accion.toLowerCase().includes('caja');

            return (
              <TableRow key={rec.id} className="border-b border-slate-800/60 hover:bg-slate-800/50 transition-colors">
                <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                  {rec.fecha}
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <Badge
                    variant={isVenta ? 'success' : isStock ? 'default' : isGasto ? 'warning' : 'info'}
                    className="text-[11px]"
                  >
                    {rec.accion}
                  </Badge>
                </TableCell>

                <TableCell className="text-xs text-slate-200 !whitespace-normal break-words max-w-[500px]">
                  {rec.detalle}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
