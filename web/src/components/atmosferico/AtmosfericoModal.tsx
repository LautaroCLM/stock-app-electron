'use client';

import React, { useState, useEffect } from 'react';
import { AtmosfericoService, AtmosfericoServiceFormData } from '@/types/atmosferico';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AtmosfericoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AtmosfericoServiceFormData) => Promise<void>;
  service?: AtmosfericoService | null;
}

export const AtmosfericoModal: React.FC<AtmosfericoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  service,
}) => {
  const [formData, setFormData] = useState<AtmosfericoServiceFormData>({
    fecha: new Date().toISOString().split('T')[0],
    cliente: '',
    direccion: '',
    telefono: '',
    tipo_servicio: 'Desagote',
    descripcion: '',
    monto: 0,
    saldo_pendiente: 0,
    estado: 'Pendiente',
    observaciones: '',
    fecha_estimada_cobro: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setFormData({
        id: service.id,
        fecha: service.fecha || new Date().toISOString().split('T')[0],
        cliente: service.cliente || '',
        direccion: service.direccion || '',
        telefono: service.telefono || '',
        tipo_servicio: service.tipo_servicio || 'Desagote',
        descripcion: service.descripcion || '',
        monto: service.monto ?? 0,
        saldo_pendiente: service.saldo_pendiente ?? service.monto ?? 0,
        estado: service.estado || 'Pendiente',
        observaciones: service.observaciones || '',
        fecha_estimada_cobro: service.fecha_estimada_cobro || '',
      });
    } else {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        cliente: '',
        direccion: '',
        telefono: '',
        tipo_servicio: 'Desagote',
        descripcion: '',
        monto: 0,
        saldo_pendiente: 0,
        estado: 'Pendiente',
        observaciones: '',
        fecha_estimada_cobro: '',
      });
    }
    setFormError(null);
  }, [service, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente.trim()) {
      setFormError('El cliente u organismo es obligatorio.');
      return;
    }
    if (!formData.direccion.trim()) {
      setFormError('La dirección es obligatoria.');
      return;
    }
    if (formData.monto <= 0) {
      setFormError('El monto total del servicio debe ser mayor a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el servicio.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={service ? `Editar Servicio #${service.id}` : 'Nuevo Servicio Atmosférico'}
      description={service ? 'Modifica los datos del servicio seleccionado.' : 'Registra un nuevo servicio de desagote o limpieza de pozo.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Fecha *"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />

          <Input
            label="Cliente / Organismo *"
            placeholder="Ej: Municipio de Luján / Juan Pérez"
            value={formData.cliente}
            onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            required
          />

          <Input
            label="Dirección *"
            placeholder="Ej: Av. Constitución 512"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Teléfono (Opcional)"
            placeholder="Ej: 2323-456789"
            value={formData.telefono || ''}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Servicio *
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.tipo_servicio || 'Desagote'}
              onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value })}
            >
              <option value="Desagote">Desagote</option>
              <option value="Destape">Destape</option>
              <option value="Limpieza de pozo">Limpieza de pozo</option>
              <option value="Transporte">Transporte</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <Input
            label="Monto Total ($) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.monto || ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFormData({ ...formData, monto: val, saldo_pendiente: val });
            }}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Descripción del trabajo *"
            placeholder="Ej: Desagote de pozo ciego de 5000 litros."
            value={formData.descripcion || ''}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            required
          />

          <Input
            label="Fecha Estimada de Cobro"
            type="date"
            value={formData.fecha_estimada_cobro || ''}
            onChange={(e) => setFormData({ ...formData, fecha_estimada_cobro: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Observaciones o Notas
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="Detalles del pago, comprobantes requeridos..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {service ? 'Guardar Cambios' : 'Registrar Servicio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
