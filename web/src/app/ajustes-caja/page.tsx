'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { CashAdjustment, CashAdjustmentFormData } from '@/types/cashAdjustment';
import { cashAdjustmentWebService } from '@/lib/services/cashAdjustmentWebService';
import { useEntityManager } from '@/hooks/useEntityManager';

import { CashAdjustmentTable } from '@/components/ajustes-caja/CashAdjustmentTable';
import { CashAdjustmentModal } from '@/components/ajustes-caja/CashAdjustmentModal';
import { CashAdjustmentFilters } from '@/components/ajustes-caja/CashAdjustmentFilters';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Scale, Calculator, Plus, RefreshCw, Radio } from 'lucide-react';

export default function AjustesCajaPage() {
  // Entity Manager for Cash Adjustments (Handles Realtime internally without duplicate channels)
  const getAdjustmentsFn = useCallback(() => cashAdjustmentWebService.getAdjustments(), []);
  const adjustmentManager = useEntityManager<CashAdjustment>('ajustes_caja', getAdjustmentsFn);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedEfecto, setSelectedEfecto] = useState<string>('');

  // Filtered Adjustments Memoized
  const filteredAdjustments = useMemo(() => {
    return adjustmentManager.items.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.motivo.toLowerCase().includes(q) ||
        (a.observacion && a.observacion.toLowerCase().includes(q)) ||
        (a.venta_id && String(a.venta_id).includes(q));

      const matchType = !selectedType || (a.tipo || '').toLowerCase() === selectedType.toLowerCase();

      const isPos = (a.monto || 0) >= 0;
      const matchEfecto =
        !selectedEfecto ||
        (selectedEfecto === 'Ingreso' && isPos) ||
        (selectedEfecto === 'Egreso' && !isPos);

      return matchSearch && matchType && matchEfecto;
    });
  }, [adjustmentManager.items, searchQuery, selectedType, selectedEfecto]);

  // KPI Metrics Calculation
  const positivos = useMemo(() => {
    return adjustmentManager.items
      .filter((a) => (a.monto || 0) >= 0)
      .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  }, [adjustmentManager.items]);

  const negativos = useMemo(() => {
    return adjustmentManager.items
      .filter((a) => (a.monto || 0) < 0)
      .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  }, [adjustmentManager.items]);

  const balance = useMemo(() => positivos + negativos, [positivos, negativos]);

  // Handlers for Save (Create or Update)
  const handleSaveAdjustment = async (formData: CashAdjustmentFormData) => {
    if (formData.id) {
      // Editar
      await cashAdjustmentWebService.createAdjustment(formData);
      adjustmentManager.showToast('Ajuste de caja actualizado correctamente.', 'success');
    } else {
      // Crear
      await cashAdjustmentWebService.createAdjustment(formData);
      adjustmentManager.showToast('Ajuste de caja guardado con éxito.', 'success');
    }
    adjustmentManager.fetchData(false);
  };

  // Handlers for Deletion
  const handleExecuteDelete = async () => {
    await adjustmentManager.executeDelete(
      (id) => cashAdjustmentWebService.deleteAdjustment(id),
      'Ajuste de caja eliminado correctamente de Supabase.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Ajustes de Caja
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro y control de diferencias de caja, retiros e ingresos manuales.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustmentManager.fetchData(true)}
            disabled={adjustmentManager.isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${adjustmentManager.isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>

          <Button variant="primary" size="sm" onClick={adjustmentManager.openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Ajuste
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ajustes Positivos</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  +{formatCurrency(positivos)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ajustes Negativos</p>
                <h4 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  -{formatCurrency(Math.abs(negativos))}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Balance de Ajustes</p>
                <h4
                  className={`text-2xl font-bold mt-1 font-mono ${
                    balance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balance))}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cantidad de Ajustes</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {adjustmentManager.items.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error alert banner */}
      <ErrorAlert error={adjustmentManager.error} onDismiss={() => adjustmentManager.setError(null)} />

      {/* Live Filters Bar */}
      <CashAdjustmentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedEfecto={selectedEfecto}
        onEfectoChange={setSelectedEfecto}
      />

      {/* Table */}
      <CashAdjustmentTable
        adjustments={filteredAdjustments}
        isLoading={adjustmentManager.isLoading}
        onDelete={adjustmentManager.openDelete}
      />

      {/* Modal Create/Edit */}
      <CashAdjustmentModal
        isOpen={adjustmentManager.isModalOpen}
        onClose={() => adjustmentManager.setIsModalOpen(false)}
        onSave={handleSaveAdjustment}
        adjustment={adjustmentManager.editingItem}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={adjustmentManager.deletingId !== null}
        onClose={() => adjustmentManager.setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar registro de ajuste de caja de Supabase?"
        message="Esta operación borrará el movimiento de ajuste de la base de datos cloud."
        isLoading={adjustmentManager.isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={adjustmentManager.toast} onClose={adjustmentManager.hideToast} />
    </div>
  );
}
