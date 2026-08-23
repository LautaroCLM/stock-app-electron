'use client';

import React, { useState, useEffect } from 'react';
import { CashAdjustment, CashAdjustmentFormData } from '@/types/cashAdjustment';
import { cashAdjustmentWebService } from '@/lib/services/cashAdjustmentWebService';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Search, ShoppingBag, AlertCircle, CheckCircle } from 'lucide-react';

interface CashAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CashAdjustmentFormData) => Promise<void>;
  adjustment?: CashAdjustment | null;
}

export const CashAdjustmentModal: React.FC<CashAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  adjustment,
}) => {
  const [efecto, setEfecto] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [tipo, setTipo] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');

  // Ticket association state
  const [asociarVenta, setAsociarVenta] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ id: number; total: number; cliente?: string; fecha?: string }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedVenta, setSelectedVenta] = useState<{ id: number; total: number; cliente?: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (adjustment) {
      const isPos = (adjustment.monto || 0) >= 0;
      setEfecto(isPos ? 'Ingreso' : 'Egreso');
      setTipo(adjustment.tipo || '');
      setMonto(String(Math.abs(adjustment.monto || 0)));
      setFecha(adjustment.fecha ? adjustment.fecha.split(' ')[0] : new Date().toISOString().split('T')[0]);
      setMotivo(adjustment.motivo || '');
      setObservacion(adjustment.observacion || '');

      if (adjustment.venta_id) {
        setAsociarVenta(true);
        setSelectedVenta({
          id: adjustment.venta_id,
          total: adjustment.ventas?.total || 0,
          cliente: adjustment.ventas?.cliente || 'Consumidor Final',
        });
      } else {
        setAsociarVenta(false);
        setSelectedVenta(null);
      }
    } else {
      setEfecto('Ingreso');
      setTipo('');
      setMonto('');
      setFecha(new Date().toISOString().split('T')[0]);
      setMotivo('');
      setObservacion('');
      setAsociarVenta(false);
      setSelectedVenta(null);
    }
    setSearchQuery('');
    setSearchResults([]);
    setFormError(null);
  }, [adjustment, isOpen]);

  // Handle live sales search
  useEffect(() => {
    if (!asociarVenta || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      cashAdjustmentWebService
        .searchSales(searchQuery)
        .then((res) => setSearchResults(res))
        .catch((err) => console.warn(err))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, asociarVenta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) {
      setFormError('Debes seleccionar el tipo de ajuste.');
      return;
    }
    if (!motivo.trim()) {
      setFormError('El motivo del ajuste es obligatorio.');
      return;
    }

    const rawMonto = parseFloat(monto);
    if (isNaN(rawMonto) || rawMonto <= 0) {
      setFormError('El monto del ajuste debe ser un número positivo mayor a cero.');
      return;
    }

    const finalMonto = efecto === 'Egreso' ? -Math.abs(rawMonto) : Math.abs(rawMonto);

    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const finalFecha = `${fecha} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    try {
      setIsSubmitting(true);
      setFormError(null);

      await onSave({
        id: adjustment?.id,
        tipo,
        motivo: motivo.trim(),
        monto: finalMonto,
        fecha: finalFecha,
        observacion: observacion.trim() || null,
        venta_id: asociarVenta && selectedVenta ? selectedVenta.id : null,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el ajuste.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={adjustment ? 'Editar Ajuste de Caja' : 'Registrar Ajuste de Caja'}
      description="Ingresos manuales, retiros de efectivo, anulación de tickets y diferencias de arqueo."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sentido del Ajuste <span className="text-red-500">*</span>
            </label>
            <select
              value={efecto}
              onChange={(e) => setEfecto(e.target.value as 'Ingreso' | 'Egreso')}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="Ingreso">Ingreso (+) (Ajuste Positivo)</option>
              <option value="Egreso">Egreso / Salida (-) (Ajuste Negativo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Ajuste <span className="text-red-500">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            >
              <option value="">Seleccionar tipo...</option>
              <option value="Venta anulada">Venta anulada</option>
              <option value="Error de carga">Error de carga</option>
              <option value="Retiro de efectivo">Retiro de efectivo</option>
              <option value="Ingreso manual">Ingreso manual</option>
              <option value="Diferencia de caja">Diferencia de caja</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Monto del Ajuste ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto (ej: 2500)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />

          <Input
            label="Fecha del Ajuste *"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            label="Motivo del Ajuste *"
            type="text"
            placeholder="Motivo explicativo (ej: Arqueo de caja turno tarde)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
          />
        </div>

        {/* Association with Sale */}
        <div className="pt-2">
          <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={asociarVenta}
              onChange={(e) => {
                setAsociarVenta(e.target.checked);
                if (!e.target.checked) setSelectedVenta(null);
              }}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500"
            />
            <span>Asociar este ajuste a una venta o ticket</span>
          </label>

          {asociarVenta && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Buscar Venta o Ticket
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Nº de ticket (#), cliente o monto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Search dropdown results */}
              {isSearching ? (
                <div className="text-[11px] text-slate-400 py-1 text-center">Buscando tickets...</div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedVenta(t);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="w-full text-left p-2.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between transition-colors"
                    >
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                        Ticket #{t.id} {t.cliente ? `— ${t.cliente}` : ''}
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(t.total)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {selectedVenta && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs flex items-center justify-between text-blue-700 dark:text-blue-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>
                      Venta Seleccionada: <strong>Ticket #{selectedVenta.id}</strong> ({formatCurrency(selectedVenta.total)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedVenta(null)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Observaciones (Opcional)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="Detalles adicionales sobre la corrección o arqueo..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {adjustment ? 'Guardar Cambios' : 'Guardar Ajuste'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
