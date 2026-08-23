'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, PaymentFormData, UpcomingDueDate } from '@/types/supplier';
import { supplierWebService } from '@/lib/services/supplierWebService';
import { Button } from '@/components/ui/Button';
import { DollarSign, X, AlertCircle } from 'lucide-react';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: PaymentFormData) => Promise<void>;
  suppliers: Supplier[];
  initialSupplierId?: number | null;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  suppliers,
  initialSupplierId,
}) => {
  const [supplierId, setSupplierId] = useState<string>('');
  const [compraId, setCompraId] = useState<string>('');
  const [fecha, setFecha] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [comprobante, setComprobante] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [pendingDebts, setPendingDebts] = useState<UpcomingDueDate[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const sid = initialSupplierId ? String(initialSupplierId) : '';
      setSupplierId(sid);
      setCompraId('');
      setFecha(new Date().toISOString().split('T')[0]);
      setMonto('');
      setMetodoPago('Efectivo');
      setComprobante('');
      setObservaciones('');
      setError(null);
      if (sid) {
        loadDebts(Number(sid));
      } else {
        setPendingDebts([]);
      }
    }
  }, [isOpen, initialSupplierId]);

  const loadDebts = async (sid: number) => {
    try {
      setIsLoadingDebts(true);
      const debts = await supplierWebService.getPendingDebts(sid);
      setPendingDebts(debts);
    } catch (err) {
      console.error('Error al cargar deudas pendientes:', err);
    } finally {
      setIsLoadingDebts(false);
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSupplierId(val);
    setCompraId('');
    if (val) {
      loadDebts(Number(val));
    } else {
      setPendingDebts([]);
    }
  };

  const handleDebtChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCompraId(val);
    if (val) {
      const selected = pendingDebts.find((d) => String(d.referencia_id) === val);
      if (selected && selected.saldo_pendiente) {
        setMonto(String(selected.saldo_pendiente));
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Seleccione un proveedor.');
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      setError('Ingrese un monto de pago válido mayor a 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        proveedor_id: Number(supplierId),
        compra_id: compraId ? Number(compraId) : null,
        fecha: fecha || new Date().toISOString().split('T')[0],
        monto: parseFloat(monto),
        metodo_pago: metodoPago,
        comprobante,
        observaciones,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el pago.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Registrar Pago a Proveedor</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">El pago descontará de la deuda acumulada del proveedor.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={handleSupplierChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar proveedor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.razon_social} {s.deuda_actual ? `(Deuda: ${formatCurrency(s.deuda_actual)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {supplierId && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vincular a Deuda / Compra Pendiente (Opcional)
                </label>
                <select
                  value={compraId}
                  onChange={handleDebtChange}
                  disabled={isLoadingDebts}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pago a cuenta general (sin vincular a compra específica)</option>
                  {pendingDebts.map((d) => (
                    <option key={d.id} value={String(d.referencia_id)}>
                      {d.descripcion || `Compra #${d.referencia_id}`} — Pendiente: {formatCurrency(d.saldo_pendiente)} (Fecha: {d.fecha})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Monto Pagado ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nro. Comprobante / Recibo
              </label>
              <input
                type="text"
                placeholder="Ej: REC-000123"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones
              </label>
              <textarea
                rows={2}
                placeholder="Notas adicionales sobre el pago..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
