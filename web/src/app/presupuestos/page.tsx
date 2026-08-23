'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Budget, BudgetFormData } from '@/types/budget';
import { Client } from '@/types/client';
import { budgetWebService } from '@/lib/services/budgetWebService';
import { clientWebService } from '@/lib/services/clientWebService';
import { useEntityManager } from '@/hooks/useEntityManager';
import { BudgetTable } from '@/components/presupuestos/BudgetTable';
import { BudgetModal } from '@/components/presupuestos/BudgetModal';
import { BudgetFilters } from '@/components/presupuestos/BudgetFilters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { FileText, Plus, RefreshCw, Radio, DollarSign, CheckCircle, Clock } from 'lucide-react';

export default function PresupuestosPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await clientWebService.getClients();
        setClients(data);
      } catch (err) {
        console.warn('[PresupuestosPage] Error al cargar lista de clientes:', err);
      }
    }
    loadClients();
  }, []);

  const getBudgetsFn = useCallback(() => budgetWebService.getBudgets(), []);

  const {
    items: budgets,
    setItems: setBudgets,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem: editingBudget,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData: fetchBudgets,
    openCreate: handleOpenCreate,
    openEdit: handleOpenEdit,
    openDelete: handleConfirmDeleteOpen,
    executeDelete,
  } = useEntityManager<Budget>('presupuestos', getBudgetsFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filtered Budgets Memoized
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchSearch =
        !searchQuery ||
        (b.cliente && b.cliente.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.cuit && b.cuit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.observaciones && b.observaciones.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.id.toString().includes(searchQuery);

      const matchStatus = !selectedStatus || (b.estado || 'Pendiente') === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [budgets, searchQuery, selectedStatus]);

  // Metrics
  const totalAmount = useMemo(() => budgets.reduce((acc, curr) => acc + Number(curr.total || 0), 0), [budgets]);
  const aprobadosCount = useMemo(() => budgets.filter((b) => (b.estado || 'Pendiente') === 'Aprobado').length, [budgets]);
  const pendientesCount = useMemo(() => budgets.filter((b) => (b.estado || 'Pendiente') === 'Pendiente').length, [budgets]);

  // Deletion Execution
  const handleExecuteDelete = async () => {
    await executeDelete(
      (id) => budgetWebService.deleteBudget(id),
      'Presupuesto eliminado correctamente de Supabase.'
    );
  };

  // Save (Create or Update)
  const handleSaveBudget = async (formData: BudgetFormData) => {
    if (formData.id) {
      const updated = await budgetWebService.updateBudget(formData.id, formData);
      setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      showToast(`Presupuesto #${updated.id} actualizado correctamente.`, 'success');
    } else {
      const created = await budgetWebService.createBudget(formData);
      setBudgets((prev) => [created, ...prev]);
      showToast(`Presupuesto #${created.id} emitido exitosamente.`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Presupuestos y Cotizaciones
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Emisión de cotizaciones comerciales y seguimiento de propuestas a clientes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBudgets(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Presupuesto
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Cotizado</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatCurrency(totalAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cotizaciones Aprobadas</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {aprobadosCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendientes de Respuesta</p>
                <h4 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {pendientesCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Live Filters Bar */}
      <BudgetFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Budget Table */}
      <BudgetTable
        budgets={filteredBudgets}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
      />

      {/* Budget Modal (Create/Edit) */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBudget}
        budget={editingBudget}
        clients={clients}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar presupuesto de Supabase?"
        message="Esta operación borrará permanentemente la cotización de la base de datos cloud."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
