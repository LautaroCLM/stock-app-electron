'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, SupplierFormData } from '@/types/supplier';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SupplierFormData) => Promise<void>;
  supplier?: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  supplier,
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    razon_social: '',
    contacto: '',
    cuit: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    observaciones: '',
    estado: 'Activo',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setFormData({
        id: supplier.id,
        razon_social: supplier.razon_social || '',
        contacto: supplier.contacto || '',
        cuit: supplier.cuit || '',
        telefono: supplier.telefono || '',
        email: supplier.email || '',
        direccion: supplier.direccion || '',
        ciudad: supplier.ciudad || '',
        provincia: supplier.provincia || '',
        observaciones: supplier.observaciones || '',
        estado: supplier.estado || 'Activo',
      });
    } else {
      setFormData({
        razon_social: '',
        contacto: '',
        cuit: '',
        telefono: '',
        email: '',
        direccion: '',
        ciudad: '',
        provincia: '',
        observaciones: '',
        estado: 'Activo',
      });
    }
    setFormError(null);
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razon_social.trim()) {
      setFormError('La razón social o nombre de la empresa es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el proveedor.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      description={supplier ? 'Modifica los datos del proveedor seleccionado.' : 'Registra un nuevo proveedor en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Razón Social / Empresa *"
            placeholder="Ej: Distribuidora del Norte SA"
            value={formData.razon_social}
            onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
            required
          />

          <Input
            label="CUIT"
            placeholder="Ej: 30-71234567-8"
            value={formData.cuit || ''}
            onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre de Contacto"
            placeholder="Ej: Carlos Gómez"
            value={formData.contacto || ''}
            onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
          />

          <Input
            label="Teléfono / WhatsApp"
            placeholder="Ej: 11 4455-6677"
            value={formData.telefono || ''}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="Ej: contacto@proveedor.com"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Dirección"
            placeholder="Ej: Calle Industrial 500"
            value={formData.direccion || ''}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Ciudad"
            placeholder="Ej: Rosario"
            value={formData.ciudad || ''}
            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
          />

          <Input
            label="Provincia"
            placeholder="Ej: Santa Fe"
            value={formData.provincia || ''}
            onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estado
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
            placeholder="Condiciones de pago, días de entrega, notas operativas..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {supplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
