'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PayrollRecord, PayrollFormData, Attendance, AttendanceFormData, PayrollConfig } from '@/types/payroll';
import { Employee } from '@/types/employee';
import { payrollWebService } from '@/lib/services/payrollWebService';
import { attendanceWebService } from '@/lib/services/attendanceWebService';
import { payrollConfigWebService } from '@/lib/services/payrollConfigWebService';
import { employeeWebService } from '@/lib/services/employeeWebService';

import { useEntityManager } from '@/hooks/useEntityManager';
import { PayrollTable } from '@/components/empleados-liquidacion/PayrollTable';
import { PayrollModal } from '@/components/empleados-liquidacion/PayrollModal';
import { AttendanceTable } from '@/components/empleados-liquidacion/AttendanceTable';
import { AttendanceModal } from '@/components/empleados-liquidacion/AttendanceModal';
import { PayrollConfigModal } from '@/components/empleados-liquidacion/PayrollConfigModal';
import { PayrollFilters } from '@/components/empleados-liquidacion/PayrollFilters';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { Receipt, UserCheck, Plus, RefreshCw, Radio, DollarSign, Calendar, Settings } from 'lucide-react';

export default function EmpleadosLiquidacionPage() {
  const [activeTab, setActiveTab] = useState<'payrolls' | 'attendance'>('payrolls');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [configs, setConfigs] = useState<PayrollConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Load complementary data (Employees + Configs)
  const loadMeta = useCallback(async () => {
    try {
      const [empData, confData] = await Promise.all([
        employeeWebService.getEmployees(),
        payrollConfigWebService.getConfigs(),
      ]);
      setEmployees(empData);
      setConfigs(confData);
    } catch (err) {
      console.warn('[EmpleadosLiquidacionPage] Error al cargar metadatos de empleados:', err);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Entity Manager for Payrolls (handles Realtime internally)
  const getPayrollsFn = useCallback(() => payrollWebService.getPayrolls(), []);
  const payrollManager = useEntityManager<PayrollRecord>('empleado_liquidaciones', getPayrollsFn);

  // Entity Manager for Attendance (handles Realtime internally)
  const getAttendancesFn = useCallback(() => attendanceWebService.getAttendances(), []);
  const attendanceManager = useEntityManager<Attendance>('asistencias', getAttendancesFn);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Filtered Payrolls Memoized
  const filteredPayrolls = useMemo(() => {
    return payrollManager.items.filter((p) => {
      const matchSearch =
        !searchQuery || (p.empleado_nombre && p.empleado_nombre.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchMonth = !selectedMonth || p.mes === selectedMonth;
      return matchSearch && matchMonth;
    });
  }, [payrollManager.items, searchQuery, selectedMonth]);

  // Filtered Attendance Memoized
  const filteredAttendances = useMemo(() => {
    return attendanceManager.items.filter((a) => {
      const matchSearch =
        !searchQuery || (a.empleado_nombre && a.empleado_nombre.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchMonth = !selectedMonth || (a.fecha && a.fecha.startsWith(selectedMonth));
      return matchSearch && matchMonth;
    });
  }, [attendanceManager.items, searchQuery, selectedMonth]);

  // Metrics
  const totalPayrollAmount = useMemo(
    () => payrollManager.items.reduce((acc, curr) => acc + Number(curr.total_liquidacion || 0), 0),
    [payrollManager.items]
  );

  const presentCount = useMemo(
    () => attendanceManager.items.filter((a) => (a.estado || 'Presente') === 'Presente').length,
    [attendanceManager.items]
  );

  // Handlers for Payroll
  const handleSavePayroll = async (formData: PayrollFormData) => {
    if (formData.id) {
      const updated = await payrollWebService.updatePayroll(formData.id, formData);
      payrollManager.setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      payrollManager.showToast(`Liquidación #${updated.id} actualizada correctamente.`, 'success');
    } else {
      const created = await payrollWebService.createPayroll(formData);
      payrollManager.setItems((prev) => [created, ...prev]);
      payrollManager.showToast(`Liquidación para ${created.empleado_nombre || 'Empleado'} generada exitosamente.`, 'success');
    }
  };

  const handleExecuteDeletePayroll = async () => {
    await payrollManager.executeDelete(
      (id) => payrollWebService.deletePayroll(id),
      'Liquidación de sueldo eliminada correctamente de Supabase.'
    );
  };

  // Handlers for Attendance
  const handleSaveAttendance = async (formData: AttendanceFormData) => {
    if (formData.id) {
      const updated = await attendanceWebService.updateAttendance(formData.id, formData);
      attendanceManager.setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      attendanceManager.showToast(`Asistencia #${updated.id} actualizada correctamente.`, 'success');
    } else {
      const created = await attendanceWebService.createAttendance(formData);
      attendanceManager.setItems((prev) => [created, ...prev]);
      attendanceManager.showToast(`Asistencia para ${created.empleado_nombre || 'Empleado'} registrada exitosamente.`, 'success');
    }
  };

  const handleExecuteDeleteAttendance = async () => {
    await attendanceManager.executeDelete(
      (id) => attendanceWebService.deleteAttendance(id),
      'Registro de asistencia eliminado de Supabase.'
    );
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Liquidación de Sueldos y Asistencias
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de recibos mensuales, tarifas horarias y presentismo del personal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              payrollManager.fetchData(true);
              attendanceManager.fetchData(true);
              loadMeta();
            }}
            disabled={payrollManager.isLoading || attendanceManager.isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${(payrollManager.isLoading || attendanceManager.isLoading) ? 'animate-spin' : ''}`} />
            Recargar
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(true)}>
            <Settings className="w-4 h-4 mr-1.5 text-blue-500" />
            Tarifas / Sueldos
          </Button>

          {activeTab === 'payrolls' ? (
            <Button variant="primary" size="sm" onClick={payrollManager.openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Liquidación
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={attendanceManager.openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              Marcar Asistencia
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Liquidado Histórico</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatCurrency(totalPayrollAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Recibos Emitidos</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {payrollManager.items.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Asistencias Confirmadas</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {presentCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('payrolls')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'payrolls'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Liquidaciones Mensuales</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Control de Asistencias</span>
        </button>
      </div>

      {/* Error Banners */}
      <ErrorAlert error={payrollManager.error} onDismiss={() => payrollManager.setError(null)} />
      <ErrorAlert error={attendanceManager.error} onDismiss={() => attendanceManager.setError(null)} />

      {/* Live Filters Bar */}
      <PayrollFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Content Body per Active Tab */}
      {activeTab === 'payrolls' ? (
        <PayrollTable
          payrolls={filteredPayrolls}
          isLoading={payrollManager.isLoading}
          onEdit={payrollManager.openEdit}
          onDelete={payrollManager.openDelete}
        />
      ) : (
        <AttendanceTable
          attendances={filteredAttendances}
          isLoading={attendanceManager.isLoading}
          onEdit={attendanceManager.openEdit}
          onDelete={attendanceManager.openDelete}
        />
      )}

      {/* Modals */}
      <PayrollModal
        isOpen={payrollManager.isModalOpen}
        onClose={() => payrollManager.setIsModalOpen(false)}
        onSave={handleSavePayroll}
        payroll={payrollManager.editingItem}
        employees={employees}
        configs={configs}
      />

      <AttendanceModal
        isOpen={attendanceManager.isModalOpen}
        onClose={() => attendanceManager.setIsModalOpen(false)}
        onSave={handleSaveAttendance}
        attendance={attendanceManager.editingItem}
        employees={employees}
      />

      <PayrollConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        employees={employees}
        onRefreshConfigs={loadMeta}
      />

      {/* Deletion Confirmations */}
      <ConfirmModal
        isOpen={payrollManager.deletingId !== null}
        onClose={() => payrollManager.setDeletingId(null)}
        onConfirm={handleExecuteDeletePayroll}
        title="¿Eliminar recibo de liquidación de Supabase?"
        message="Esta operación borrará el recibo mensual generado de la base de datos cloud."
        isLoading={payrollManager.isDeleting}
      />

      <ConfirmModal
        isOpen={attendanceManager.deletingId !== null}
        onClose={() => attendanceManager.setDeletingId(null)}
        onConfirm={handleExecuteDeleteAttendance}
        title="¿Eliminar marca de asistencia de Supabase?"
        message="Esta operación borrará el registro de horario de la base de datos cloud."
        isLoading={attendanceManager.isDeleting}
      />

      {/* Toast Notifications */}
      <ToastNotification toast={payrollManager.toast} onClose={payrollManager.hideToast} />
      <ToastNotification toast={attendanceManager.toast} onClose={attendanceManager.hideToast} />
    </div>
  </AdminGuard>
  );
}
