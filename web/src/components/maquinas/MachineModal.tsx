'use client';

import React, { useState, useEffect } from 'react';
import { Machine, MachineFormData } from '@/types/machine';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MachineFormData) => Promise<void>;
  machine?: Machine | null;
}

export const MachineModal: React.FC<MachineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  machine,
}) => {
  const [formData, setFormData] = useState<MachineFormData>({
    nombre: '',
    tipo: 'Retroexcavadora',
    marca: '',
    modelo: '',
    anio: undefined,
    numero_serie: '',
    valor_hora: 0,
    horas_totales: 0,
    estado: 'Disponible',
    observaciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (machine) {
      setFormData({
        id: machine.id,
        nombre: machine.nombre || '',
        tipo: machine.tipo || 'Retroexcavadora',
        marca: machine.marca || '',
        modelo: machine.modelo || '',
        anio: machine.anio || undefined,
        numero_serie: machine.numero_serie || '',
        valor_hora: machine.valor_hora ?? 0,
        horas_totales: machine.horas_totales ?? 0,
        estado: machine.estado || 'Disponible',
        observaciones: machine.observaciones || '',
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'Retroexcavadora',
        marca: '',
        modelo: '',
        anio: undefined,
        numero_serie: '',
        valor_hora: 0,
        horas_totales: 0,
        estado: 'Disponible',
        observaciones: '',
      });
    }
    setFormError(null);
  }, [machine, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre de la máquina o vehículo es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la máquina.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={machine ? 'Editar Máquina / Equipo' : 'Registrar Nueva Máquina'}
      description={machine ? 'Modifica las especificaciones de la máquina seleccionada.' : 'Ingresa un nuevo equipo o vehículo a la flota en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre de la Máquina *"
            placeholder="Ej: Retroexcavadora CAT 320"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo / Tipo de Equipo
            </label>
            <input
              type="text"
              list="machine-tipos-list"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.tipo || 'Retroexcavadora'}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              placeholder="Escribe o selecciona..."
            />
            <datalist id="machine-tipos-list">
              <option value="Retroexcavadora" />
              <option value="Camión Cisterna" />
              <option value="Camión Volcador" />
              <option value="Tractor" />
              <option value="Compresor" />
              <option value="Minicargadora" />
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Marca"
            placeholder="Ej: Caterpillar, JCB"
            value={formData.marca || ''}
            onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
          />

          <Input
            label="Modelo"
            placeholder="Ej: 320D"
            value={formData.modelo || ''}
            onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
          />

          <Input
            label="Año"
            type="number"
            placeholder="Ej: 2022"
            value={formData.anio || ''}
            onChange={(e) => setFormData({ ...formData, anio: Number(e.target.value) || undefined })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="N° Serie / Chasis"
            placeholder="Ej: CAT0320D9876"
            value={formData.numero_serie || ''}
            onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
          />

          <Input
            label="Valor Hora ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.valor_hora || ''}
            onChange={(e) => setFormData({ ...formData, valor_hora: Number(e.target.value) })}
          />

          <Input
            label="Horómetro (Hs Totales)"
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={formData.horas_totales || ''}
            onChange={(e) => setFormData({ ...formData, horas_totales: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Estado Operativo
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.estado || 'Disponible'}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          >
            <option value="Disponible">Disponible</option>
            <option value="En Uso">En Uso / Alquilada</option>
            <option value="En Mantenimiento">En Mantenimiento / Taller</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Observaciones o Ficha Técnica
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="Detalles sobre seguro, patentes, historial de service..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {machine ? 'Guardar Cambios' : 'Registrar Máquina'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
