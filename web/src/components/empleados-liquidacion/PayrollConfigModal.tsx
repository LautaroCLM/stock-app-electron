'use client';

import React, { useState, useEffect } from 'react';
import { Employee } from '@/types/employee';
import { PayrollConfig } from '@/types/payroll';
import { payrollConfigWebService } from '@/lib/services/payrollConfigWebService';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Settings, AlertCircle } from 'lucide-react';

interface PayrollConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onRefreshConfigs: () => void;
}

export const PayrollConfigModal: React.FC<PayrollConfigModalProps> = ({
  isOpen,
  onClose,
  employees,
  onRefreshConfigs,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [valorHora, setValorHora] = useState<string>('');
  const [costoMensual, setCostoMensual] = useState<string>('');
  const [estado, setEstado] = useState<string>('Activo');

  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (employees.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(String(employees[0].id));
      }
    }
  }, [isOpen, employees, selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId) {
      const empId = Number(selectedEmployeeId);
      setIsLoadingConfig(true);
      setError(null);
      payrollConfigWebService.getConfigByEmployee(empId)
        .then((config) => {
          if (config) {
            setValorHora(String(config.valor_hora || 0));
            setCostoMensual(String(config.costo_mensual || 0));
            setEstado(config.estado || 'Activo');
          } else {
            setValorHora('0');
            setCostoMensual('0');
            setEstado('Activo');
          }
        })
        .catch((err) => {
          console.error(err);
          setError('Error al cargar la configuración salarial del empleado.');
        })
        .finally(() => {
          setIsLoadingConfig(false);
        });
    }
  }, [selectedEmployeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('Debes seleccionar un empleado.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await payrollConfigWebService.saveConfig({
        empleado_id: Number(selectedEmployeeId),
        valor_hora: parseFloat(valorHora) || 0,
        costo_mensual: parseFloat(costoMensual) || 0,
        estado,
      });

      onRefreshConfigs();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar configuración.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Tarifas y Salarios"
      description="Define el valor por hora y el costo mensual de cada empleado para el cálculo automático de recibos."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Empleado / Personal <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.apellido}, {emp.nombre} — DNI: {emp.dni} ({emp.cargo || 'Empleado'})
              </option>
            ))}
          </select>
        </div>

        {isLoadingConfig ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Cargando tarifas...</span>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Valor Hora ($) *"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valorHora}
                onChange={(e) => setValorHora(e.target.value)}
                required
              />

              <Input
                label="Costo / Sueldo Mensual ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={costoMensual}
                onChange={(e) => setCostoMensual(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estado Salarial
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Activo">Activo</option>
                <option value="Suspendido">Suspendido</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Guardar Configuración
          </Button>
        </div>
      </form>
    </Modal>
  );
};
