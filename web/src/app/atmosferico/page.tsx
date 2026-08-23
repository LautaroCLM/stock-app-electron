'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { AtmosfericoService, AtmosfericoServiceFormData } from '@/types/atmosferico';
import { atmosfericoWebService } from '@/lib/services/atmosfericoWebService';
import { useEntityManager } from '@/hooks/useEntityManager';
import { AtmosfericoTable } from '@/components/atmosferico/AtmosfericoTable';
import { AtmosfericoModal } from '@/components/atmosferico/AtmosfericoModal';
import { AtmosfericoPaymentModal } from '@/components/atmosferico/AtmosfericoPaymentModal';
import { AtmosfericoDueDatesModal } from '@/components/atmosferico/AtmosfericoDueDatesModal';
import { AtmosfericoStatsModal } from '@/components/atmosferico/AtmosfericoStatsModal';
import { AtmosfericoFilters } from '@/components/atmosferico/AtmosfericoFilters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Truck, Plus, RefreshCw, Radio, DollarSign, Clock, HandCoins, Calendar, BarChart2 } from 'lucide-react';

export default function AtmosfericoPage() {
  const getServicesFn = useCallback(() => atmosfericoWebService.getServices(), []);

  const {
    items: services,
    setItems: setServices,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem: editingService,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData: fetchServices,
    openCreate: handleOpenCreate,
    openEdit: handleOpenEdit,
    openDelete: handleConfirmDeleteOpen,
    executeDelete,
  } = useEntityManager<AtmosfericoService>('atmos_ordenes', getServicesFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Auxiliary Modals State
  const [paymentService, setPaymentService] = useState<AtmosfericoService | null>(null);
  const [isDueDatesModalOpen, setIsDueDatesModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Filtered Services Memoized
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.direccion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.observaciones && s.observaciones.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = !selectedStatus || (s.estado || 'Pendiente') === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [services, searchQuery, selectedStatus]);

  // Metrics
  const totalFacturado = useMemo(() => services.reduce((acc, curr) => acc + Number(curr.monto || 0), 0), [services]);
  const totalPendiente = useMemo(() => services.reduce((acc, curr) => acc + Number(curr.saldo_pendiente ?? curr.monto ?? 0), 0), [services]);
  const totalCobrado = useMemo(() => Math.max(0, totalFacturado - totalPendiente), [totalFacturado, totalPendiente]);

  // Deletion Execution
  const handleExecuteDelete = async () => {
    await executeDelete(
      (id) => atmosfericoWebService.deleteService(id),
      'Servicio atmosférico eliminado correctamente de Supabase.'
    );
  };

  // Save (Create or Update)
  const handleSaveService = async (formData: AtmosfericoServiceFormData) => {
    if (formData.id) {
      const updated = await atmosfericoWebService.updateService(formData.id, formData);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(`Servicio Atmosférico #${updated.id} actualizado correctamente.`, 'success');
    } else {
      const created = await atmosfericoWebService.createService(formData);
      setServices((prev) => [created, ...prev]);
      showToast(`Servicio Atmosférico #${created.id} registrado exitosamente.`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Servicios Atmosféricos
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de desagotes, destapes y seguimiento de cobros atmosféricos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchServices(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsDueDatesModalOpen(true)}>
            <Calendar className="w-4 h-4 mr-1.5 text-amber-500" />
            Próximos Cobros
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsStatsModalOpen(true)}>
            <BarChart2 className="w-4 h-4 mr-1.5 text-indigo-500" />
            Estadísticas
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Facturado</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatCurrency(totalFacturado)}
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
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Cobrado</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatCurrency(totalCobrado)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <HandCoins className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo Pendiente de Cobro</p>
                <h4 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {formatCurrency(totalPendiente)}
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
      <AtmosfericoFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Services Table */}
      <AtmosfericoTable
        services={filteredServices}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
        onManagePayments={(service) => setPaymentService(service)}
      />

      {/* Atmosferico Modal (Create/Edit) */}
      <AtmosfericoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveService}
        service={editingService}
      />

      {/* Atmosferico Payment Modal */}
      <AtmosfericoPaymentModal
        isOpen={paymentService !== null}
        onClose={() => setPaymentService(null)}
        service={paymentService}
        onRefreshParent={() => fetchServices(false)}
      />

      {/* Atmosferico Due Dates Modal */}
      <AtmosfericoDueDatesModal
        isOpen={isDueDatesModalOpen}
        onClose={() => setIsDueDatesModalOpen(false)}
      />

      {/* Atmosferico Stats Modal */}
      <AtmosfericoStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar servicio atmosférico de Supabase?"
        message="Esta operación borrará permanentemente el registro de servicio y sus cobros asociados."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
