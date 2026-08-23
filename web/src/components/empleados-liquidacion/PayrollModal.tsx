'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PayrollRecord, PayrollFormData, PayrollConfig } from '@/types/payroll';
import { Employee } from '@/types/employee';
import { payrollWebService } from '@/lib/services/payrollWebService';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface PayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PayrollFormData) => Promise<void>;
  payroll?: PayrollRecord | null;
  employees: Employee[];
  configs: PayrollConfig[];
}

export const PayrollModal: React.FC<PayrollModalProps> = ({
  isOpen,
  onClose,
  onSave,
  payroll,
  employees,
  configs,
}) => {
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  const [formData, setFormData] = useState<PayrollFormData>({
    empleado_id: 0,
    mes: currentMonthStr,
    horas_trabajadas: 0,
    valor_hora: 0,
    adicionales: 0,
    descuentos: 0,
    total_generado: 0,
    total_liquidacion: 0,
  });

  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEmployeeSummary = useCallback(async (empId: number, month: string) => {
    if (!empId || !month) return;
    try {
      setIsLoadingSummary(true);
      const summary = await payrollWebService.getEmployeeMonthSummary(empId, month);
      
      const vHora = summary.valor_hora || (configs.find(c => c.empleado_id === empId)?.valor_hora || 0);
      const horas = summary.horas_trabajadas || 0;
      const adic = formData.adicionales || 0;
      const desc = formData.descuentos || 0;
      const totGen = (horas * vHora) + adic;
      const totLiq = Math.max(0, totGen - desc);

      setFormData(prev => ({
        ...prev,
        empleado_id: empId,
        mes: month,
        horas_trabajadas: horas,
        valor_hora: vHora,
        total_generado: totGen,
        total_liquidacion: totLiq,
      }));
    } catch (err) {
      console.warn('[PayrollModal] Error al obtener resumen mensual:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [configs, formData.adicionales, formData.descuentos]);

  useEffect(() => {
    if (payroll) {
      setFormData({
        id: payroll.id,
        empleado_id: payroll.empleado_id,
        mes: payroll.mes || currentMonthStr,
        horas_trabajadas: payroll.horas_trabajadas ?? 0,
        valor_hora: payroll.valor_hora ?? 0,
        adicionales: payroll.adicionales ?? 0,
        descuentos: payroll.descuentos ?? 0,
        total_generado: payroll.total_generado ?? 0,
        total_liquidacion: payroll.total_liquidacion ?? 0,
      });
    } else {
      const defaultEmpId = employees.length > 0 ? employees[0].id : 0;
      const conf = configs.find((c) => c.empleado_id === defaultEmpId);
      const vHora = conf ? conf.valor_hora || 0 : 0;

      setFormData({
        empleado_id: defaultEmpId,
        mes: currentMonthStr,
        horas_trabajadas: 0,
        valor_hora: vHora,
        adicionales: 0,
        descuentos: 0,
        total_generado: 0,
        total_liquidacion: 0,
      });

      if (defaultEmpId) {
        loadEmployeeSummary(defaultEmpId, currentMonthStr);
      }
    }
    setFormError(null);
  }, [payroll, isOpen, employees, configs, currentMonthStr, loadEmployeeSummary]);

  const handleEmployeeSelect = (empIdNum: number) => {
    if (!empIdNum) return;
    loadEmployeeSummary(empIdNum, formData.mes || currentMonthStr);
  };

  const handleMonthChange = (monthStr: string) => {
    setFormData(prev => ({ ...prev, mes: monthStr }));
    if (formData.empleado_id) {
      loadEmployeeSummary(formData.empleado_id, monthStr);
    }
  };

  const handleRecalculate = (
    horasNum?: number,
    vHoraNum?: number,
    adicNum?: number,
    descNum?: number
  ) => {
    const horas = horasNum !== undefined ? horasNum : formData.horas_trabajadas;
    const vHora = vHoraNum !== undefined ? vHoraNum : formData.valor_hora;
    const adic = adicNum !== undefined ? adicNum : formData.adicionales;
    const desc = descNum !== undefined ? descNum : formData.descuentos;

    const totGen = (horas * vHora) + adic;
    const totLiq = Math.max(0, totGen - desc);

    setFormData((prev) => ({
      ...prev,
      horas_trabajadas: horas,
      valor_hora: vHora,
      adicionales: adic,
      descuentos: desc,
      total_generado: totGen,
      total_liquidacion: totLiq,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleado_id) {
      setFormError('Debes seleccionar un empleado.');
      return;
    }
    if (!formData.mes) {
      setFormError('El período de liquidación (Mes) es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar liquidación.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={payroll ? 'Editar Recibo de Liquidación' : 'Generar Liquidación de Sueldo'}
      description={payroll ? 'Modifica los montos de la liquidación seleccionada.' : 'Calcula el recibo mensual en base a horas trabajadas y tarifa en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Empleado *
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.empleado_id}
              onChange={(e) => handleEmployeeSelect(Number(e.target.value))}
              required
            >
              <option value={0}>-- Selecciona Empleado --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.apellido}, {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Período Liquidado (AAAA-MM) *"
            type="month"
            value={formData.mes}
            onChange={(e) => handleMonthChange(e.target.value)}
            required
          />
        </div>

        {isLoadingSummary ? (
          <div className="py-4 text-center">
            <span className="text-xs text-blue-500 animate-pulse font-medium">Calculando horas asistidas del mes...</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Horas Trabajadas *"
            type="number"
            step="0.1"
            min="0"
            value={formData.horas_trabajadas || ''}
            onChange={(e) => handleRecalculate(Number(e.target.value), undefined, undefined, undefined)}
            required
          />

          <Input
            label="Valor Hora ($) *"
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_hora || ''}
            onChange={(e) => handleRecalculate(undefined, Number(e.target.value), undefined, undefined)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Adicionales / Bonos ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.adicionales || ''}
            onChange={(e) => handleRecalculate(undefined, undefined, Number(e.target.value), undefined)}
          />

          <Input
            label="Descuentos / Adelantos ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.descuentos || ''}
            onChange={(e) => handleRecalculate(undefined, undefined, undefined, Number(e.target.value))}
          />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Final a Liquidar:</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(formData.total_liquidacion || 0)}
          </span>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {payroll ? 'Guardar Cambios' : 'Confirmar Liquidación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

