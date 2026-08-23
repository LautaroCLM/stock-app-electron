'use client';

import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData } from '@/types/employee';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => Promise<void>;
  employee?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employee,
}) => {
  const [formData, setFormData] = useState<EmployeeFormData>({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: '',
    cargo: 'Empleado',
    estado: 'Activo',
    observaciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        id: employee.id,
        nombre: employee.nombre || '',
        apellido: employee.apellido || '',
        dni: employee.dni || '',
        telefono: employee.telefono || '',
        email: employee.email || '',
        direccion: employee.direccion || '',
        cargo: employee.cargo || 'Empleado',
        estado: employee.estado || 'Activo',
        observaciones: employee.observaciones || '',
      });
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        email: '',
        direccion: '',
        cargo: 'Empleado',
        estado: 'Activo',
        observaciones: '',
      });
    }
    setFormError(null);
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.dni.trim()) {
      setFormError('Nombre, Apellido y DNI son campos obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el empleado.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? 'Editar Legajo de Empleado' : 'Registrar Nuevo Empleado'}
      description={employee ? 'Modifica los datos del legajo seleccionado.' : 'Registra un nuevo integrante del personal en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Apellido *"
            placeholder="Ej: Pérez"
            value={formData.apellido}
            onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
            required
          />

          <Input
            label="Nombre *"
            placeholder="Ej: Juan Carlos"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />

          <Input
            label="DNI / Legajo *"
            placeholder="Ej: 35123456"
            value={formData.dni}
            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cargo / Puesto
            </label>
            <input
              type="text"
              list="employee-cargos-list"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.cargo || 'Empleado'}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              placeholder="Escribe o selecciona cargo..."
            />
            <datalist id="employee-cargos-list">
              <option value="Operario" />
              <option value="Chofer" />
              <option value="Encargado" />
              <option value="Administrativo" />
              <option value="Vendedor" />
              <option value="Mantenimiento" />
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estado Laboral
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Teléfono / Celular"
            placeholder="Ej: 11 3344-5566"
            value={formData.telefono || ''}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="Ej: empleado@empresa.com"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <Input
          label="Dirección / Domicilio"
          placeholder="Ej: Calle Belgrano 456, Quilmes"
          value={formData.direccion || ''}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Observaciones o Notas
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="Notas sobre licencias, modalidad de trabajo, horarios..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {employee ? 'Guardar Cambios' : 'Registrar Empleado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
