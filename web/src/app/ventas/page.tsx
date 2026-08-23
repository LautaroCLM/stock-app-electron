'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sale, SaleFormData } from '@/types/sale';
import { Product } from '@/types/product';
import { Client } from '@/types/client';
import { saleWebService } from '@/lib/services/saleWebService';
import { useToast } from '@/hooks/useToast';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { SaleTable } from '@/components/ventas/SaleTable';
import { SaleModal } from '@/components/ventas/SaleModal';
import { SaleFilters } from '@/components/ventas/SaleFilters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Plus, RefreshCw, Radio, AlertCircle, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deletion Confirmation State
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Toast Hook
  const { toast, showToast, hideToast } = useToast();

  // Load sales, products and clients from Supabase
  const fetchSales = useCallback(async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setIsLoading(true);
      setError(null);

      const salesData = await saleWebService.getSales();
      setSales(salesData);

      const [prodsData, clientsData] = await Promise.all([
        saleWebService.getAvailableProducts(),
        saleWebService.getAvailableClients(),
      ]);

      setProducts(prodsData);
      setClients(clientsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con Supabase.';
      setError(message);
      showToast(message, 'error');
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchSales(true);
  }, [fetchSales]);

  // Reusable Realtime Custom Hook
  useSupabaseRealtime('ventas', useCallback(() => {
    fetchSales(false);
  }, [fetchSales]));

  // Filtered Sales Memoized
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        !searchQuery ||
        (s.cliente && s.cliente.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.producto_nombre && s.producto_nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.id.toString().includes(searchQuery);

      const matchMethod =
        !selectedPaymentMethod || (s.metodo_pago || 'Efectivo') === selectedPaymentMethod;

      return matchSearch && matchMethod;
    });
  }, [sales, searchQuery, selectedPaymentMethod]);

  // KPI Metrics Calculation
  const todaySalesAmount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sales
      .filter((s) => s.fecha && s.fecha.startsWith(todayStr))
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  }, [sales]);

  const monthSalesAmount = useMemo(() => {
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    return sales
      .filter((s) => s.fecha && s.fecha.startsWith(currentMonthStr))
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  }, [sales]);

  const totalFacturadoAmount = useMemo(() => {
    return sales.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  }, [sales]);

  // Modal Open Handlers
  const handleOpenCreate = () => {
    setIsModalOpen(true);
  };

  // Deletion Confirmation
  const handleConfirmDeleteOpen = (id: number) => {
    setDeletingId(id);
  };

  const handleExecuteDelete = async () => {
    if (!deletingId) return;

    try {
      setIsDeleting(true);
      const targetId = deletingId;

      // Optimistic state update
      setSales((prev) => prev.filter((s) => s.id !== targetId));

      await saleWebService.deleteSale(targetId);
      showToast('Venta anulada/eliminada correctamente de Supabase.', 'success');
      setDeletingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al anular la venta.';
      showToast(message, 'error');
      fetchSales(false); // Revert state on error
    } finally {
      setIsDeleting(false);
    }
  };

  // Save (Create)
  const handleSaveSale = async (formData: SaleFormData) => {
    const created = await saleWebService.createSale(formData);
    setSales((prev) => [created, ...prev]);
    showToast(`Venta #${created.id} registrada exitosamente por ${formatCurrency(created.total)}.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Historial de Ventas
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro de operaciones de facturación y punto de venta en tiempo real.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSales(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ventas del Día</p>
                <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {formatCurrency(todaySalesAmount)}
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
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ventas del Mes</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatCurrency(monthSalesAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Facturado</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatCurrency(totalFacturadoAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cantidad de Ventas</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {sales.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error alert banner */}
      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="underline hover:no-underline text-xs">
            Descartar
          </button>
        </div>
      ) : null}

      {/* Live Filters Bar */}
      <SaleFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
      />

      {/* Sale Table */}
      <SaleTable
        sales={filteredSales}
        isLoading={isLoading}
        onDelete={handleConfirmDeleteOpen}
      />

      {/* Sale Modal (Create) */}
      <SaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSale}
        products={products}
        clients={clients}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Anular / Eliminar venta de Supabase?"
        message="Esta operación anulará el registro de facturación de la base de datos cloud."
        isLoading={isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}
