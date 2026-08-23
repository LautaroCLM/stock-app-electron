'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AtmosfericoService, AtmosfericoPago } from '@/types/atmosferico';
import { atmosfericoWebService } from '@/lib/services/atmosfericoWebService';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, X, Trash2, RefreshCw, AlertCircle, Plus } from 'lucide-react';

interface AtmosfericoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: AtmosfericoService | null;
  onRefreshParent: () => void;
}

export const AtmosfericoPaymentModal: React.FC<AtmosfericoPaymentModalProps> = ({
  isOpen,
  onClose,
  service,
  onRefreshParent,
}) => {
  const [payments, setPayments] = useState<AtmosfericoPago[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fecha, setFecha] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('Transferencia');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchPayments = useCallback(async () => {
    if (!service) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await atmosfericoWebService.getPayments(service.id);
      setPayments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener cobros.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (isOpen && service) {
      fetchPayments();
      setFecha(new Date().toISOString().split('T')[0]);
      setMonto(service.saldo_pendiente ? String(service.saldo_pendiente) : '');
      setMetodoPago('Transferencia');
      setObservaciones('');
    }
  }, [isOpen, service, fetchPayments]);

  if (!isOpen || !service) return null;

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) {
      setError('El monto debe ser un número positivo mayor a 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await atmosfericoWebService.createPayment({
        orden_id: service.id,
        fecha: fecha || new Date().toISOString().split('T')[0],
        monto: parseFloat(monto),
        metodo_pago: metodoPago,
        observaciones,
      });

      setMonto('');
      setObservaciones('');
      await fetchPayments();
      onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el cobro.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (pagoId: number) => {
    if (!confirm('¿Eliminar cobro? El saldo del servicio se recalculará.')) return;

    try {
      setError(null);
      await atmosfericoWebService.deletePayment(pagoId, service.id);
      await fetchPayments();
      onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el cobro.';
      setError(msg);
    }
  };

  const totalPagado = payments.reduce((acc, p) => acc + Number(p.monto || 0), 0);
  const saldoPendiente = Math.max(0, (service.monto || 0) - totalPagado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Cobros del Servicio Atmosférico #{service.id}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {service.cliente} — {service.direccion}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchPayments} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="px-6 py-3 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Servicio</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
              {formatCurrency(service.monto || 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Cobrado</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatCurrency(totalPagado)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Saldo Pendiente</span>
            <span className={`font-mono font-bold text-sm ${saldoPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {formatCurrency(saldoPendiente)}
            </span>
          </div>
        </div>

        {/* Form and List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form to Register Payment */}
          <form onSubmit={handleAddPayment} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Registrar Nuevo Cobro</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha Cobro <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monto ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Depósito">Depósito</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observaciones / Comprobante
              </label>
              <input
                type="text"
                placeholder="Ej: Nro de transferencia 77123..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Agregar Cobro'}
              </Button>
            </div>
          </form>

          {/* Payment List */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">Historial de Cobros Recibidos</h4>
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Cargando cobros...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400">No hay cobros registrados para este servicio.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto ($)</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatDate(p.fecha)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-900 dark:text-slate-100 font-medium">
                        {p.metodo_pago || 'Transferencia'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.monto || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {p.observaciones || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 hover:text-red-600 dark:hover:text-red-400"
                          title="Eliminar cobro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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
