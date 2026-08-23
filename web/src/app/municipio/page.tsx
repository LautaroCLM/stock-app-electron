'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { MunicipioOrder, MunicipioOrderFormData } from '@/types/municipio';
import { municipioWebService } from '@/lib/services/municipioWebService';
import { useEntityManager } from '@/hooks/useEntityManager';
import { MunicipioTable } from '@/components/municipio/MunicipioTable';
import { MunicipioModal } from '@/components/municipio/MunicipioModal';
import { MunicipioPaymentModal } from '@/components/municipio/MunicipioPaymentModal';
import { MunicipioFilters } from '@/components/municipio/MunicipioFilters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Building2, Plus, RefreshCw, Radio, DollarSign, Clock, FileText } from 'lucide-react';

export default function MunicipioPage() {
  const getOrdersFn = useCallback(() => municipioWebService.getOrders(), []);

  const {
    items: orders,
    setItems: setOrders,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem: editingOrder,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData: fetchOrders,
    openCreate: handleOpenCreate,
    openEdit: handleOpenEdit,
    openDelete: handleConfirmDeleteOpen,
    executeDelete,
  } = useEntityManager<MunicipioOrder>('municipio_ordenes', getOrdersFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Payment Modal State
  const [paymentOrder, setPaymentOrder] = useState<MunicipioOrder | null>(null);

  // Filtered Orders Memoized
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !searchQuery ||
        (o.expediente && o.expediente.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.orden_compra && o.orden_compra.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.observaciones && o.observaciones.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = !selectedStatus || (o.estado || 'Pendiente') === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, selectedStatus]);

  // Metrics
  const totalAmount = useMemo(() => orders.reduce((acc, curr) => acc + Number(curr.total || 0), 0), [orders]);
  const totalPendingAmount = useMemo(() => orders.reduce((acc, curr) => acc + Number(curr.saldo_pendiente ?? curr.total ?? 0), 0), [orders]);

  // Deletion Execution
  const handleExecuteDelete = async () => {
    await executeDelete(
      (id) => municipioWebService.deleteOrder(id),
      'Orden municipal eliminada correctamente de Supabase.'
    );
  };

  // Save (Create or Update)
  const handleSaveOrder = async (formData: MunicipioOrderFormData) => {
    if (formData.id) {
      const updated = await municipioWebService.updateOrder(formData.id, formData);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showToast(`Orden Municipal #${updated.id} actualizada correctamente.`, 'success');
    } else {
      const created = await municipioWebService.createOrder(formData);
      setOrders((prev) => [created, ...prev]);
      showToast(`Orden Municipal #${created.id} registrada exitosamente.`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Contratos y Órdenes del Municipio
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión de expedientes, órdenes de compra de agua potable y saldos a cobrar.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Facturado Municipio</p>
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
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo Pendiente de Cobro</p>
                <h4 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {formatCurrency(totalPendingAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cantidad de Órdenes</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {orders.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Live Filters Bar */}
      <MunicipioFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Municipio Table */}
      <MunicipioTable
        orders={filteredOrders}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
        onManagePayments={(order) => setPaymentOrder(order)}
      />

      {/* Municipio Modal (Create/Edit) */}
      <MunicipioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOrder}
        order={editingOrder}
      />

      {/* Municipio Payment Modal */}
      <MunicipioPaymentModal
        isOpen={paymentOrder !== null}
        onClose={() => setPaymentOrder(null)}
        order={paymentOrder}
        onRefreshParent={() => fetchOrders(false)}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar orden municipal de Supabase?"
        message="Esta operación borrará permanentemente el expediente u orden de compra de la base de datos cloud."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}

