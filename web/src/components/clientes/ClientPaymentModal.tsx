'use client';

import React, { useState, useEffect } from 'react';
import { ClientSale, ClientPaymentFormData } from '@/types/client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface ClientPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: ClientPaymentFormData) => Promise<void>;
  sale: ClientSale | null;
}

export const ClientPaymentModal: React.FC<ClientPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sale,
}) => {
  const [fecha, setFecha] = useState('');
  const [monto, setMonto] = useState<number | ''>('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [comprobante, setComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale) {
      const hoy = new Date().toISOString().split('T')[0];
      setFecha(hoy);
      setMonto(sale.saldo_pendiente);
      setMetodoPago('Efectivo');
      setComprobante(`Recibo Venta #${sale.id}`);
      setObservaciones('');
      setErrorMsg(null);
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const valMonto = Number(monto);
    if (!valMonto || valMonto <= 0) {
      setErrorMsg('El monto del cobro debe ser mayor a cero.');
      return;
    }

    if (valMonto > sale.saldo_pendiente) {
      setErrorMsg(
        `El monto ingresado (${formatCurrency(valMonto)}) no puede ser mayor al saldo pendiente (${formatCurrency(sale.saldo_pendiente)}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        cliente_id: sale.cliente_id,
        venta_id: sale.id,
        fecha,
        monto: valMonto,
        metodo_pago: metodoPago,
        comprobante: comprobante.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar el cobro.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Registrar Cobro de Venta #{sale.id}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saldo Pendiente Actual: <span className="font-bold text-red-600 font-mono">{formatCurrency(sale.saldo_pendiente)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg ? (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fecha de Cobro <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Monto a Cobrar ($) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={sale.saldo_pendiente}
              required
              placeholder="Ingresa el monto..."
              value={monto}
              onChange={(e) => setMonto(parseFloat(e.target.value) || '')}
              className="font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Cheque">Cheque</option>
              <option value="MercadoPago">MercadoPago / QR</option>
              <option value="Débito">Tarjeta Débito</option>
              <option value="Crédito">Tarjeta Crédito</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Comprobante / Recibo
            </label>
            <Input
              placeholder="Ej: Recibo #00123"
              value={comprobante}
              onChange={(e) => setComprobante(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones
            </label>
            <Input
              placeholder="Comentarios sobre el pago..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Confirmar Cobro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
