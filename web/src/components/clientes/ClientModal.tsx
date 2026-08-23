'use client';

import React, { useState, useEffect } from 'react';
import { Client, ClientFormData } from '@/types/client';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ClientFormData) => Promise<void>;
  client?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  client,
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    nombre: '',
    cuit: '',
    telefono: '',
    email: '',
    direccion: '',
    observaciones: '',
    estado: 'Activo',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setFormData({
        id: client.id,
        nombre: client.nombre || '',
        cuit: client.cuit || '',
        telefono: client.telefono || '',
        email: client.email || '',
        direccion: client.direccion || '',
        observaciones: client.observaciones || '',
        estado: client.estado || 'Activo',
      });
    } else {
      setFormData({
        nombre: '',
        cuit: '',
        telefono: '',
        email: '',
        direccion: '',
        observaciones: '',
        estado: 'Activo',
      });
    }
    setFormError(null);
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre o razón social es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el cliente.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Editar Cliente' : 'Nuevo Cliente'}
      description={client ? 'Modifica los datos del cliente seleccionado.' : 'Registra un nuevo cliente en la base de datos cloud de Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre / Razón Social *"
            placeholder="Ej: Juan Pérez o Constructora SRL"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />

          <Input
            label="CUIT / DNI"
            placeholder="Ej: 20-35123456-9"
            value={formData.cuit || ''}
            onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Teléfono / WhatsApp"
            placeholder="Ej: 11 4567-8900"
            value={formData.telefono || ''}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="Ej: cliente@empresa.com"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Dirección / Domicilio"
            placeholder="Ej: Av. San Martín 1234, CABA"
            value={formData.direccion || ''}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estado de la Cuenta
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.estado || 'Activo'}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
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
            placeholder="Notas sobre el cliente, preferencia de facturación, etc."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {client ? 'Guardar Cambios' : 'Registrar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
