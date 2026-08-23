'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Supplier, SupplierFormData, PurchaseFormData, PaymentFormData } from '@/types/supplier';
import { supplierWebService } from '@/lib/services/supplierWebService';
import { useEntityManager } from '@/hooks/useEntityManager';
import { SupplierTable } from '@/components/proveedores/SupplierTable';
import { SupplierModal } from '@/components/proveedores/SupplierModal';
import { SupplierFilters } from '@/components/proveedores/SupplierFilters';
import { SupplierPurchaseModal } from '@/components/proveedores/SupplierPurchaseModal';
import { SupplierPaymentModal } from '@/components/proveedores/SupplierPaymentModal';
import { SupplierAccountModal } from '@/components/proveedores/SupplierAccountModal';
import { SupplierDueDatesModal } from '@/components/proveedores/SupplierDueDatesModal';
import { SupplierStatsModal } from '@/components/proveedores/SupplierStatsModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Truck, RefreshCw, Radio, Plus, ShoppingBag, DollarSign, Calendar, BarChart2, FileText, AlertTriangle } from 'lucide-react';

export default function ProveedoresPage() {
  const getSuppliersFn = useCallback(() => supplierWebService.getSuppliers(), []);

  const {
    items: suppliers,
    setItems: setSuppliers,
    isLoading,
    error,
    setError,
    isModalOpen,
    setIsModalOpen,
    editingItem: editingSupplier,
    deletingId,
    setDeletingId,
    isDeleting,
    toast,
    showToast,
    hideToast,
    fetchData: fetchSuppliers,
    openCreate: handleOpenCreate,
    openEdit: handleOpenEdit,
    openDelete: handleConfirmDeleteOpen,
    executeDelete,
  } = useEntityManager<Supplier>('proveedores', getSuppliersFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Auxiliary Modals State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDueDatesModalOpen, setIsDueDatesModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [accountSupplier, setAccountSupplier] = useState<Supplier | null>(null);

  // Filtered Suppliers Memoized
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.cuit && s.cuit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.contacto && s.contacto.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.telefono && s.telefono.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = !selectedStatus || (s.estado || 'Activo') === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [suppliers, searchQuery, selectedStatus]);

  // Metrics
  const totalDeudaAcumulada = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.deuda_actual || 0), 0);
  }, [suppliers]);

  const activeCount = useMemo(() => suppliers.filter(s => (s.estado || 'Activo') === 'Activo').length, [suppliers]);

  // Deletion Execution
  const handleExecuteDelete = async () => {
    await executeDelete(
      (id) => supplierWebService.deleteSupplier(id),
      'Proveedor eliminado correctamente de Supabase.'
    );
  };

  // Save Supplier (Create or Update)
  const handleSaveSupplier = async (formData: SupplierFormData) => {
    if (formData.id) {
      const updated = await supplierWebService.updateSupplier(formData.id, formData);
      setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      showToast(`Proveedor "${updated.razon_social}" actualizado correctamente.`, 'success');
    } else {
      const created = await supplierWebService.createSupplier(formData);
      setSuppliers((prev) => [created, ...prev]);
      showToast(`Proveedor "${created.razon_social}" registrado exitosamente.`, 'success');
    }
  };

  // Save Purchase
  const handleSavePurchase = async (compraData: PurchaseFormData) => {
    await supplierWebService.createPurchase(compraData);
    showToast('Compra registrada exitosamente.', 'success');
    fetchSuppliers(false);
  };

  // Save Payment
  const handleSavePayment = async (pagoData: PaymentFormData) => {
    await supplierWebService.createPayment(pagoData);
    showToast('Pago a proveedor registrado exitosamente.', 'success');
    fetchSuppliers(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Padrón de Proveedores
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión integral de proveedores, compras, pagos, deudas y cuenta corriente conectada a Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSuppliers(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsDueDatesModalOpen(true)}>
            <Calendar className="w-4 h-4 mr-1.5 text-amber-500" />
            Vencimientos
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsStatsModalOpen(true)}>
            <BarChart2 className="w-4 h-4 mr-1.5 text-indigo-500" />
            Estadísticas
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsPurchaseModalOpen(true)}>
            <ShoppingBag className="w-4 h-4 mr-1.5 text-blue-500" />
            Registrar Compra
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(true)}>
            <DollarSign className="w-4 h-4 mr-1.5 text-emerald-500" />
            Registrar Pago
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Proveedor
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Proveedores Activos</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {activeCount}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Deuda Total Acumulada</p>
                <h4 className={`text-2xl font-bold mt-1 font-mono ${totalDeudaAcumulada > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(totalDeudaAcumulada)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Proveedores con Deuda</p>
                <h4 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {suppliers.filter(s => (s.deuda_actual || 0) > 0).length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error alert banner */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Live Filters Bar */}
      <SupplierFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Supplier Table */}
      <SupplierTable
        suppliers={filteredSuppliers}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
        onViewAccount={(s) => setAccountSupplier(s)}
      />

      {/* Supplier Modal (Create/Edit) */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSupplier}
        supplier={editingSupplier}
      />

      {/* Supplier Purchase Modal */}
      <SupplierPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSave={handleSavePurchase}
        suppliers={suppliers}
      />

      {/* Supplier Payment Modal */}
      <SupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        suppliers={suppliers}
      />

      {/* Supplier Cuenta Corriente Modal */}
      <SupplierAccountModal
        isOpen={accountSupplier !== null}
        onClose={() => setAccountSupplier(null)}
        supplier={accountSupplier}
        onRefreshParent={() => fetchSuppliers(false)}
      />

      {/* Supplier Due Dates Modal */}
      <SupplierDueDatesModal
        isOpen={isDueDatesModalOpen}
        onClose={() => setIsDueDatesModalOpen(false)}
      />

      {/* Supplier Stats Modal */}
      <SupplierStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar proveedor de Supabase?"
        message="Esta operación borrará permanentemente el proveedor y sus compras, pagos y cuenta corriente asociadas."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}

