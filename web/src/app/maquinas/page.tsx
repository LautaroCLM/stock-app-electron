'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Machine, MachineFormData } from '@/types/machine';
import { machineWebService } from '@/lib/services/machineWebService';
import { useEntityManager } from '@/hooks/useEntityManager';
import { MachineTable } from '@/components/maquinas/MachineTable';
import { MachineModal } from '@/components/maquinas/MachineModal';
import { MachineWorkLogModal } from '@/components/maquinas/MachineWorkLogModal';
import { MachineFuelLogModal } from '@/components/maquinas/MachineFuelLogModal';
import { MachineMaintenanceLogModal } from '@/components/maquinas/MachineMaintenanceLogModal';
import { MachineProfitabilityModal } from '@/components/maquinas/MachineProfitabilityModal';
import { MachineStatsModal } from '@/components/maquinas/MachineStatsModal';
import { MachineFilters } from '@/components/maquinas/MachineFilters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Cog, Plus, RefreshCw, Radio, CheckCircle, Wrench, TrendingUp, BarChart2 } from 'lucide-react';

export default function MaquinasPage() {
  const getMachinesFn = useCallback(() => machineWebService.getMachines(), []);

  const {
    items: machines,
    setItems: setMachines,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem: editingMachine,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData: fetchMachines,
    openCreate: handleOpenCreate,
    openEdit: handleOpenEdit,
    openDelete: handleConfirmDeleteOpen,
    executeDelete,
  } = useEntityManager<Machine>('maquinas', getMachinesFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Auxiliary Modals State
  const [workLogMachine, setWorkLogMachine] = useState<Machine | null>(null);
  const [fuelLogMachine, setFuelLogMachine] = useState<Machine | null>(null);
  const [maintenanceLogMachine, setMaintenanceLogMachine] = useState<Machine | null>(null);
  const [isProfitabilityModalOpen, setIsProfitabilityModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Filtered Machines Memoized
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchSearch =
        !searchQuery ||
        m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.marca && m.marca.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.modelo && m.modelo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.numero_serie && m.numero_serie.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = !selectedStatus || (m.estado || 'Disponible') === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [machines, searchQuery, selectedStatus]);

  // Metrics
  const disponiblesCount = useMemo(() => machines.filter((m) => (m.estado || 'Disponible') === 'Disponible').length, [machines]);
  const mantenimientoCount = useMemo(() => machines.filter((m) => (m.estado || '') === 'En Mantenimiento' || m.estado === 'En mantenimiento').length, [machines]);

  // Deletion Execution
  const handleExecuteDelete = async () => {
    await executeDelete(
      (id) => machineWebService.deleteMachine(id),
      'Máquina eliminada correctamente de Supabase.'
    );
  };

  // Save (Create or Update)
  const handleSaveMachine = async (formData: MachineFormData) => {
    if (formData.id) {
      const updated = await machineWebService.updateMachine(formData.id, formData);
      setMachines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      showToast(`Máquina "${updated.nombre}" actualizada correctamente.`, 'success');
    } else {
      const created = await machineWebService.createMachine(formData);
      setMachines((prev) => [created, ...prev]);
      showToast(`Máquina "${created.nombre}" registrada exitosamente.`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Flota de Maquinaria y Equipos
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de máquinas pesadas, horómetros, partes de trabajo, combustible y mantenimientos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMachines(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsProfitabilityModalOpen(true)}>
            <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-500" />
            Rentabilidad
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsStatsModalOpen(true)}>
            <BarChart2 className="w-4 h-4 mr-1.5 text-indigo-500" />
            Estadísticas
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Máquina
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Flota</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {machines.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Cog className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Máquinas Disponibles</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {disponiblesCount}
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
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">En Mantenimiento</p>
                <h4 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {mantenimientoCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Live Filters Bar */}
      <MachineFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Machine Table */}
      <MachineTable
        machines={filteredMachines}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
        onOpenWorkLog={(m) => setWorkLogMachine(m)}
        onOpenFuelLog={(m) => setFuelLogMachine(m)}
        onOpenMaintenanceLog={(m) => setMaintenanceLogMachine(m)}
      />

      {/* Machine Modal (Create/Edit) */}
      <MachineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMachine}
        machine={editingMachine}
      />

      {/* Work Log Modal */}
      <MachineWorkLogModal
        isOpen={workLogMachine !== null}
        onClose={() => setWorkLogMachine(null)}
        machine={workLogMachine}
        onRefreshParent={() => fetchMachines(false)}
      />

      {/* Fuel Log Modal */}
      <MachineFuelLogModal
        isOpen={fuelLogMachine !== null}
        onClose={() => setFuelLogMachine(null)}
        machine={fuelLogMachine}
        onRefreshParent={() => fetchMachines(false)}
      />

      {/* Maintenance Log Modal */}
      <MachineMaintenanceLogModal
        isOpen={maintenanceLogMachine !== null}
        onClose={() => setMaintenanceLogMachine(null)}
        machine={maintenanceLogMachine}
        onRefreshParent={() => fetchMachines(false)}
      />

      {/* Profitability Modal */}
      <MachineProfitabilityModal
        isOpen={isProfitabilityModalOpen}
        onClose={() => setIsProfitabilityModalOpen(false)}
      />

      {/* Stats Modal */}
      <MachineStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar máquina de Supabase?"
        message="Esta operación borrará permanentemente la máquina y sus partes de trabajo, combustible y mantenimientos asociados."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
