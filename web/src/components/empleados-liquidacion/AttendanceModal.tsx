'use client';

import React, { useState, useEffect } from 'react';
import { Attendance, AttendanceFormData } from '@/types/payroll';
import { Employee } from '@/types/employee';
import { calcAttHoras } from '@/lib/services/attendanceWebService';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AttendanceFormData) => Promise<void>;
  attendance?: Attendance | null;
  employees: Employee[];
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  attendance,
  employees,
}) => {
  const [formData, setFormData] = useState<AttendanceFormData>({
    empleado_id: 0,
    fecha: new Date().toISOString().split('T')[0],
    hora_entrada: '08:00',
    hora_salida: '17:00',
    estado: 'Presente',
    observaciones: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (attendance) {
      setFormData({
        id: attendance.id,
        empleado_id: attendance.empleado_id,
        fecha: attendance.fecha || new Date().toISOString().split('T')[0],
        hora_entrada: attendance.hora_entrada || '',
        hora_salida: attendance.hora_salida || '',
        estado: attendance.estado || 'Presente',
        observaciones: attendance.observaciones || '',
      });
    } else {
      setFormData({
        empleado_id: employees.length > 0 ? employees[0].id : 0,
        fecha: new Date().toISOString().split('T')[0],
        hora_entrada: '08:00',
        hora_salida: '17:00',
        estado: 'Presente',
        observaciones: '',
      });
    }
    setFormError(null);
  }, [attendance, isOpen, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleado_id) {
      setFormError('Debes seleccionar un empleado.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar asistencia.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const horasCalculadas = calcAttHoras(formData.hora_entrada, formData.hora_salida);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={attendance ? 'Editar Registro de Asistencia' : 'Marcar Asistencia de Empleado'}
      description={attendance ? 'Modifica los horarios o estado de la asistencia seleccionada.' : 'Registra la entrada, salida y presentismo en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Empleado *
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.empleado_id}
            onChange={(e) => setFormData({ ...formData, empleado_id: Number(e.target.value) })}
            required
          >
            <option value={0}>-- Selecciona Empleado --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.apellido}, {emp.nombre} (DNI: {emp.dni})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha *"
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estado de Presentismo
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.estado || 'Presente'}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="Presente">Presente</option>
              <option value="Ausente">Ausente</option>
              <option value="Tarde">Llegada Tarde</option>
              <option value="Licencia">Licencia / Franco</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Hora de Entrada"
            type="time"
            value={formData.hora_entrada || ''}
            onChange={(e) => setFormData({ ...formData, hora_entrada: e.target.value })}
          />

          <Input
            label="Hora de Salida"
            type="time"
            value={formData.hora_salida || ''}
            onChange={(e) => setFormData({ ...formData, hora_salida: e.target.value })}
          />
        </div>

        {formData.hora_entrada && formData.hora_salida ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Horas netas calculadas:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{horasCalculadas} hs</span>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Observaciones o Notas
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            placeholder="Motivo de tardanza, permiso especial..."
            value={formData.observaciones || ''}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {attendance ? 'Guardar Cambios' : 'Registrar Asistencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

