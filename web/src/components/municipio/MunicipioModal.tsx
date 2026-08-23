'use client';

import React, { useState, useEffect } from 'react';
import { MunicipioOrder, MunicipioOrderFormData } from '@/types/municipio';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface MunicipioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MunicipioOrderFormData) => Promise<void>;
  order?: MunicipioOrder | null;
}

export const MunicipioModal: React.FC<MunicipioModalProps> = ({
  isOpen,
  onClose,
  onSave,
  order,
}) => {
  const [formData, setFormData] = useState<MunicipioOrderFormData>({
    fecha: new Date().toISOString().split('T')[0],
    expediente: '',
    orden_compra: '',
    fecha_estimada_cobro: '',
    total: 0,
    saldo_pendiente: 0,
    estado: 'Pendiente',
    observaciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setFormData({
        id: order.id,
        fecha: order.fecha || new Date().toISOString().split('T')[0],
        expediente: order.expediente || '',
        orden_compra: order.orden_compra || '',
        fecha_estimada_cobro: order.fecha_estimada_cobro || '',
        total: order.total ?? 0,
        saldo_pendiente: order.saldo_pendiente ?? order.total ?? 0,
        estado: order.estado || 'Pendiente',
        observaciones: order.observaciones || '',
      });
    } else {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        expediente: '',
        orden_compra: '',
        fecha_estimada_cobro: '',
        total: 0,
        saldo_pendiente: 0,
        estado: 'Pendiente',
        observaciones: '',
      });
    }
    setFormError(null);
  }, [order, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.total <= 0) {
      setFormError('El monto total de la orden debe ser mayor a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la orden.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? 'Editar Orden Municipal' : 'Registrar Orden Municipal'}
      description={order ? 'Modifica los datos de la orden seleccionada.' : 'Ingresa una nueva orden o expediente del municipio.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha de la Orden *"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />

          <Input
            label="N° Expediente"
            placeholder="Ej: EXP-2026-9876"
            value={formData.expediente || ''}
            onChange={(e) => setFormData({ ...formData, expediente: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="N° Orden de Compra / Contrato"
            placeholder="Ej: OC-4512"
            value={formData.orden_compra || ''}
            onChange={(e) => setFormData({ ...formData, orden_compra: e.target.value })}
          />

          <Input
            label="Fecha Estimada de Cobro"
            type="date"
            value={formData.fecha_estimada_cobro || ''}
            onChange={(e) => setFormData({ ...formData, fecha_estimada_cobro: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Total Facturado ($) *"
            type="number"
            step="0.01"
            min="0"
            value={formData.total || ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFormData({ ...formData, total: val, saldo_pendiente: val });
            }}
            required
          />

          <Input
            label="Saldo Pendiente ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.saldo_pendiente ?? ''}
            onChange={(e) => setFormData({ ...formData, saldo_pendiente: Number(e.target.value) })}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estado de la Orden
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.estado || 'Pendiente'}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Cobrado">Cobrado</option>
              <option value="Parcialmente Cobrado">Parcialmente Cobrado</option>
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
            placeholder="Detalles del contrato municipal, camiones cisterna, entregas..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {order ? 'Guardar Cambios' : 'Registrar Orden'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
