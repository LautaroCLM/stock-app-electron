'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Employee, EmployeeFormData } from '@/types/employee';
import { employeeWebService } from '@/lib/services/employeeWebService';
import { useEntityManager } from '@/hooks/useEntityManager';
import { EmployeeTable } from '@/components/empleados/EmployeeTable';
import { EmployeeModal } from '@/components/empleados/EmployeeModal';
import { EmployeeFilters } from '@/components/empleados/EmployeeFilters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserPlus, RefreshCw, Radio, Users, CheckCircle, XCircle } from 'lucide-react';

export default function EmpleadosPage() {
  const getEmployeesFn = useCallback(() => employeeWebService.getEmployees(), []);

  const {
    items: employees,
    setItems: setEmployees,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem: editingEmployee,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData: fetchEmployees,
    openCreate: handleOpenCreate,
    openEdit: handleOpenEdit,
    openDelete: handleConfirmDeleteOpen,
    executeDelete,
  } = useEntityManager<Employee>('empleados', getEmployeesFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filtered & Sorted Employees Memoized
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const fullname = `${e.apellido} ${e.nombre}`.toLowerCase();
      const matchSearch =
        !searchQuery ||
        fullname.includes(searchQuery.toLowerCase()) ||
        (e.dni && e.dni.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.cargo && e.cargo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.telefono && e.telefono.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = !selectedStatus || (e.estado || 'Activo') === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [employees, searchQuery, selectedStatus]);

  // Metrics
  const activeCount = useMemo(() => employees.filter(e => (e.estado || 'Activo') === 'Activo').length, [employees]);
  const inactiveCount = useMemo(() => employees.filter(e => (e.estado || 'Activo') === 'Inactivo').length, [employees]);

  // Deletion Execution
  const handleExecuteDelete = async () => {
    await executeDelete(
      (id) => employeeWebService.deleteEmployee(id),
      'Legajo de empleado eliminado correctamente de Supabase.'
    );
  };

  // Save (Create or Update)
  const handleSaveEmployee = async (formData: EmployeeFormData) => {
    if (formData.id) {
      const updated = await employeeWebService.updateEmployee(formData.id, formData);
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast(`Empleado "${updated.apellido}, ${updated.nombre}" actualizado correctamente.`, 'success');
    } else {
      const created = await employeeWebService.createEmployee(formData);
      setEmployees((prev) => [created, ...prev]);
      showToast(`Empleado "${created.apellido}, ${created.nombre}" registrado exitosamente.`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Padrón de Empleados
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de personal y legajos laborales conectada en tiempo real a Supabase.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEmployees(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Personal</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {employees.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Empleados Activos</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {activeCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inactivos / Licencia</p>
                <h4 className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  {inactiveCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Live Filters Bar */}
      <EmployeeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Employee Table */}
      <EmployeeTable
        employees={filteredEmployees}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
      />

      {/* Employee Modal (Create/Edit) */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar legajo de empleado de Supabase?"
        message="Esta operación borrará permanentemente el registro del personal de la base de datos cloud."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
