'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TrendingUp, Percent, Check } from 'lucide-react';

interface UpdatePricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onConfirm: (data: { percent: number; category: string; priceType: 'venta' | 'costo' }) => Promise<void>;
}

export const UpdatePricesModal: React.FC<UpdatePricesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onConfirm,
}) => {
  const [percentInput, setPercentInput] = useState<string>('10');
  const [selectedCategory, setSelectedCategory] = useState<string>('__all__');
  const [priceType, setPriceType] = useState<'venta' | 'costo'>('venta');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const percent = parseFloat(percentInput);
    if (isNaN(percent) || percent === 0) {
      setErrorMsg('Por favor ingresa un porcentaje válido distinto de cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirm({
        percent,
        category: selectedCategory,
        priceType,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar precios.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const percentVal = parseFloat(percentInput) || 0;
  const actionText = percentVal >= 0 ? `aumento del ${percentVal}%` : `descuento del ${Math.abs(percentVal)}%`;
  const targetText = priceType === 'venta' ? 'Precios de venta' : 'Precios de costo';
  const categoryText = selectedCategory === '__all__' ? 'todos los productos' : `categoría "${selectedCategory}"`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title={
        <div className="flex items-center space-x-2 text-blue-500 dark:text-blue-400">
          <TrendingUp className="w-5 h-5" />
          <span className="font-bold text-slate-900 dark:text-slate-100">
            Actualizar Precios Masivamente
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMsg}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Porcentaje de Ajuste (%)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="any"
                placeholder="Ej: 10 para aumentar, -10 para reducir"
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
                required
              />
              <div className="absolute right-3 top-2.5 text-slate-400">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Usa valores positivos para aumentos (ej: 10) y negativos para reducciones (ej: -10).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="__all__">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Campo Afectado
            </label>
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as 'venta' | 'costo')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="venta">Precios de Venta (precio)</option>
              <option value="costo">Precios de Costo (precio_costo)</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 font-medium">
          Se aplicará un <span className="font-bold">{actionText}</span> sobre los <span className="font-bold">{targetText}</span> de <span className="font-bold">{categoryText}</span>.
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Check className="w-4 h-4 mr-1.5" /> Aplicar Cambio
          </Button>
        </div>
      </form>
    </Modal>
  );
};
