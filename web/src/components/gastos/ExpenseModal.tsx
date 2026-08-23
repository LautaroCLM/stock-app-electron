'use client';

import React, { useState, useEffect } from 'react';
import { Expense, ExpenseFormData } from '@/types/expense';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => Promise<void>;
  expense?: Expense | null;
  categories: string[];
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expense,
  categories,
}) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    categoria: 'General',
    monto: 0,
    observacion: '',
    estado: 'Pagado',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setFormData({
        id: expense.id,
        fecha: expense.fecha || new Date().toISOString().split('T')[0],
        concepto: expense.concepto || '',
        categoria: expense.categoria || 'General',
        monto: expense.monto ?? 0,
        observacion: expense.observacion || '',
        estado: expense.estado || 'Pagado',
      });
    } else {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        concepto: '',
        categoria: 'General',
        monto: 0,
        observacion: '',
        estado: 'Pagado',
      });
    }
    setFormError(null);
  }, [expense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.concepto.trim()) {
      setFormError('El concepto o descripción del gasto es obligatorio.');
      return;
    }
    if (formData.monto <= 0) {
      setFormError('El monto del gasto debe ser un valor positivo mayor a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el gasto.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? 'Editar Gasto Operativo' : 'Registrar Nuevo Gasto'}
      description={expense ? 'Modifica los datos del gasto seleccionado.' : 'Registra un egreso de caja en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha del Gasto *"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />

          <Input
            label="Monto ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.monto || ''}
            onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
            required
          />
        </div>

        <Input
          label="Concepto / Descripción *"
          placeholder="Ej: Pago de luz local comercial, Alquiler depósito, Insumos de oficina"
          value={formData.concepto}
          onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Categoría
            </label>
            <input
              type="text"
              list="expense-categories-list"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.categoria || 'General'}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              placeholder="Escribe o selecciona categoría..."
            />
            <datalist id="expense-categories-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estado de Pago
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.estado || 'Pagado'}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Observaciones o Notas
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="N° de factura, método de pago, detalles adicionales..."
            value={formData.observacion || ''}
            onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {expense ? 'Guardar Cambios' : 'Registrar Gasto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
