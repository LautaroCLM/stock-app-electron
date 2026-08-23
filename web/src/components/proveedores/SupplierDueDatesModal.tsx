'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UpcomingDueDate } from '@/types/supplier';
import { supplierWebService } from '@/lib/services/supplierWebService';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { X, RefreshCw, AlertCircle, Calendar } from 'lucide-react';

interface SupplierDueDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierDueDatesModal: React.FC<SupplierDueDatesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dueDates, setDueDates] = useState<UpcomingDueDate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDueDates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await supplierWebService.getUpcomingDueDates();
      setDueDates(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener vencimientos.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDueDates();
    }
  }, [isOpen, fetchDueDates]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  const getDaysRemaining = (vencimientoStr?: string | null) => {
    if (!vencimientoStr) return null;
    const vto = new Date(vencimientoStr);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    vto.setHours(0, 0, 0, 0);
    const diffTime = vto.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Vencimientos de Deudas a Proveedores</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Control y alerta de facturas y compromisos con fecha de vencimiento.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchDueDates} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Cargando vencimientos...</span>
            </div>
          ) : dueDates.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sin vencimientos pendientes</p>
              <p className="text-[11px] text-slate-400">No hay deudas con fecha de vencimiento que requieran atención inmediata.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Fecha Vto.</TableHead>
                  <TableHead className="text-center">Días Restantes</TableHead>
                  <TableHead className="text-right">Saldo Pendiente</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueDates.map((d) => {
                  const dias = getDaysRemaining(d.fecha_vencimiento);
                  const isVencido = dias !== null && dias < 0;

                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {d.proveedor_nombre}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {d.descripcion || `Compra #${d.referencia_id}`}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-700 dark:text-slate-300">
                        {d.fecha_vencimiento}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {dias === null ? (
                          '-'
                        ) : isVencido ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                            Vencido ({Math.abs(dias)} días)
                          </span>
                        ) : dias === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            Vence Hoy
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                            {dias} días
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(d.saldo_pendiente)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isVencido ? 'danger' : 'warning'}>
                          {d.estado_pago || 'Pendiente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
