'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Budget, BudgetFormData } from '@/types/budget';
import { Client } from '@/types/client';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { formatCurrency } from '@/lib/utils';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BudgetFormData) => Promise<void>;
  budget?: Budget | null;
  clients?: Client[];
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  budget,
  clients = [],
}) => {
  const [formData, setFormData] = useState<BudgetFormData>({
    fecha: new Date().toISOString().split('T')[0],
    cliente: '',
    cuit: '',
    telefono: '',
    direccion: '',
    localidad: '',
    subtotal: 0,
    descuento: 0,
    recargo: 0,
    total: 0,
    estado: 'Pendiente',
    observaciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Convert clients to SearchableSelect options
  const clientOptions: SelectOption[] = useMemo(() => {
    return clients.map((c) => ({
      value: c.nombre,
      label: c.nombre,
      sublabel: c.cuit ? `CUIT: ${c.cuit} | Tel: ${c.telefono || '-'}` : c.telefono ? `Tel: ${c.telefono}` : undefined,
    }));
  }, [clients]);

  useEffect(() => {
    if (budget) {
      setFormData({
        id: budget.id,
        fecha: budget.fecha || new Date().toISOString().split('T')[0],
        cliente: budget.cliente || '',
        cuit: budget.cuit || '',
        telefono: budget.telefono || '',
        direccion: budget.direccion || '',
        localidad: budget.localidad || '',
        subtotal: budget.subtotal ?? budget.total ?? 0,
        descuento: budget.descuento ?? 0,
        recargo: budget.recargo ?? 0,
        total: budget.total ?? 0,
        estado: budget.estado || 'Pendiente',
        observaciones: budget.observaciones || '',
      });
    } else {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        cliente: '',
        cuit: '',
        telefono: '',
        direccion: '',
        localidad: '',
        subtotal: 0,
        descuento: 0,
        recargo: 0,
        total: 0,
        estado: 'Pendiente',
        observaciones: '',
      });
    }
    setFormError(null);
  }, [budget, isOpen]);

  const handleClientSelect = (val: string | number | null) => {
    const selectedName = String(val || '');
    const foundClient = clients.find((c) => c.nombre === selectedName);

    setFormData((prev) => ({
      ...prev,
      cliente: selectedName,
      cuit: foundClient ? foundClient.cuit || prev.cuit : prev.cuit,
      telefono: foundClient ? foundClient.telefono || prev.telefono : prev.telefono,
    }));
  };

  const handleRecalculate = (subNum?: number, descNum?: number, recNum?: number) => {
    const sub = subNum !== undefined ? subNum : formData.subtotal;
    const desc = descNum !== undefined ? descNum : (formData.descuento || 0);
    const rec = recNum !== undefined ? recNum : (formData.recargo || 0);
    const tot = Math.max(0, sub - desc + rec);

    setFormData((prev) => ({
      ...prev,
      subtotal: sub,
      descuento: desc,
      recargo: rec,
      total: tot,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.total <= 0) {
      setFormError('El monto total del presupuesto debe ser mayor a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el presupuesto.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={budget ? 'Editar Presupuesto / Cotización' : 'Emitir Nuevo Presupuesto'}
      description={budget ? 'Modifica los valores del presupuesto seleccionado.' : 'Genera una nueva cotización comercial en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha del Presupuesto *"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />

          <SearchableSelect
            label="Cliente / Razón Social"
            options={clientOptions}
            value={formData.cliente}
            onChange={handleClientSelect}
            placeholder="Buscar o escribir cliente..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="CUIT / DNI"
            placeholder="Ej: 30-71123456-8"
            value={formData.cuit || ''}
            onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
          />

          <Input
            label="Teléfono de Contacto"
            placeholder="Ej: 11 4455-6677"
            value={formData.telefono || ''}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />

          <Input
            label="Localidad / Ciudad"
            placeholder="Ej: Quilmes"
            value={formData.localidad || ''}
            onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Subtotal ($) *"
            type="number"
            step="0.01"
            min="0"
            value={formData.subtotal || ''}
            onChange={(e) => handleRecalculate(Number(e.target.value), undefined, undefined)}
            required
          />

          <Input
            label="Descuento ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.descuento || ''}
            onChange={(e) => handleRecalculate(undefined, Number(e.target.value), undefined)}
          />

          <Input
            label="Recargo ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.recargo || ''}
            onChange={(e) => handleRecalculate(undefined, undefined, Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Estado del Presupuesto
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.estado || 'Pendiente'}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          >
            <option value="Pendiente">Pendiente de Aprobación</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Vencido">Vencido</option>
          </select>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Final Presupuestado:</span>
          <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {formatCurrency(formData.total || 0)}
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Observaciones o Términos de Validez
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="Validez de la oferta (ej: 15 días), condiciones de pago..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {budget ? 'Guardar Cambios' : 'Emitir Presupuesto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
