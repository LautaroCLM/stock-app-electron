'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Client,
  ClientFormData,
  ClientSale,
  ClientSaleFormData,
  ClientPaymentFormData,
  ClientStats,
} from '@/types/client';
import { clientWebService } from '@/lib/services/clientWebService';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

// Componentes UI de Clientes
import { ClientSalesTable } from '@/components/clientes/ClientSalesTable';
import { ClientSaleModal } from '@/components/clientes/ClientSaleModal';
import { ClientSaleDetailModal } from '@/components/clientes/ClientSaleDetailModal';
import { ClientPaymentModal } from '@/components/clientes/ClientPaymentModal';
import { ClientUpcomingTable } from '@/components/clientes/ClientUpcomingTable';
import { ClientStatsView } from '@/components/clientes/ClientStatsView';
import { ClientTable } from '@/components/clientes/ClientTable';
import { ClientModal } from '@/components/clientes/ClientModal';
import { ClientFilters } from '@/components/clientes/ClientFilters';

// Componentes UI Globales
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification, ToastMessage } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import {
  UserCheck,
  Plus,
  RefreshCw,
  Radio,
  DollarSign,
  Clock,
  FileText,
  Users,
  CalendarCheck,
  BarChart3,
  Search,
} from 'lucide-react';

type TabType = 'sales' | 'padron' | 'upcoming' | 'stats';

export default function ClientesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');

  // Main State
  const [sales, setSales] = useState<ClientSale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [upcomingSales, setUpcomingSales] = useState<ClientSale[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);

  // Loading & Error State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State (Ventas)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filters State (Padrón Clientes)
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSelectedStatus, setClientSelectedStatus] = useState('');

  // Modals State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedDetailSale, setSelectedDetailSale] = useState<ClientSale | null>(null);
  const [selectedPaymentSale, setSelectedPaymentSale] = useState<ClientSale | null>(null);

  // Padrón Client Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Deletion Confirmation State
  const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch All Data from Supabase
  const loadAllData = useCallback(
    async (showLoadingSpinner = true) => {
      try {
        if (showLoadingSpinner) setIsLoading(true);
        setError(null);

        const [salesData, clientsData, statsData] = await Promise.all([
          clientWebService.getSales(),
          clientWebService.getClients(),
          clientWebService.getStats(),
        ]);

        setSales(salesData);
        setClients(clientsData);
        setStats(statsData);

        const upcoming = salesData
          .filter((s) => s.saldo_pendiente > 0)
          .sort((a, b) => {
            const dA = a.fecha_estimada_cobro ? new Date(a.fecha_estimada_cobro).getTime() : Infinity;
            const dB = b.fecha_estimada_cobro ? new Date(b.fecha_estimada_cobro).getTime() : Infinity;
            return dA - dB;
          });
        setUpcomingSales(upcoming);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al conectar con Supabase.';
        setError(message);
        showToast(message, 'error');
      } finally {
        if (showLoadingSpinner) setIsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadAllData(true);
  }, [loadAllData]);

  // Supabase Realtime Subscription Hooks
  useSupabaseRealtime(
    'cliente_ventas',
    useCallback(() => {
      loadAllData(false);
    }, [loadAllData])
  );

  useSupabaseRealtime(
    'clientes',
    useCallback(() => {
      loadAllData(false);
    }, [loadAllData])
  );

  // Memoized Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.id.toString().includes(searchQuery) ||
        (s.cliente_nombre && s.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.comprobante && s.comprobante.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.observaciones && s.observaciones.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = !selectedStatus || s.estado === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [sales, searchQuery, selectedStatus]);

  // Memoized Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !clientSearchQuery ||
        c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        (c.cuit && c.cuit.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
        (c.telefono && c.telefono.toLowerCase().includes(clientSearchQuery.toLowerCase()));

      const matchStatus = !clientSelectedStatus || (c.estado || 'Activo') === clientSelectedStatus;

      return matchSearch && matchStatus;
    });
  }, [clients, clientSearchQuery, clientSelectedStatus]);

  // Metrics
  const totalAmount = useMemo(
    () => sales.reduce((acc, curr) => acc + Number(curr.total || 0), 0),
    [sales]
  );
  const totalPendingAmount = useMemo(
    () => sales.reduce((acc, curr) => acc + Number(curr.saldo_pendiente || 0), 0),
    [sales]
  );

  // Sale Handlers
  const handleSaveSale = async (formData: ClientSaleFormData) => {
    await clientWebService.createSale(formData);
    showToast('Venta a cuenta corriente registrada y stock descontado exitosamente.', 'success');
    await loadAllData(false);
  };

  const handleExecuteDeleteSale = async () => {
    if (!deletingSaleId) return;
    try {
      setIsDeleting(true);
      await clientWebService.deleteSale(deletingSaleId);
      showToast('Venta eliminada y stock restituido correctamente.', 'success');
      setDeletingSaleId(null);
      await loadAllData(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar venta.';
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Payment Handler
  const handleSavePayment = async (formData: ClientPaymentFormData) => {
    await clientWebService.createPayment(formData);
    showToast('Cobro registrado correctamente.', 'success');
    await loadAllData(false);
    if (selectedDetailSale) {
      const updatedSales = await clientWebService.getSales();
      const updated = updatedSales.find((s) => s.id === selectedDetailSale.id);
      if (updated) setSelectedDetailSale(updated);
    }
  };

  // Client Padrón Handlers
  const handleSaveClient = async (formData: ClientFormData) => {
    if (formData.id) {
      const updated = await clientWebService.updateClient(formData.id, formData);
      showToast(`Cliente "${updated.nombre}" actualizado correctamente.`, 'success');
    } else {
      const created = await clientWebService.createClient(formData);
      showToast(`Cliente "${created.nombre}" creado exitosamente.`, 'success');
    }
    await loadAllData(false);
  };

  const handleExecuteDeleteClient = async () => {
    if (!deletingClientId) return;
    try {
      setIsDeleting(true);
      await clientWebService.deleteClient(deletingClientId);
      showToast('Cliente eliminado correctamente de Supabase.', 'success');
      setDeletingClientId(null);
      await loadAllData(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar cliente.';
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Clientes y Cuentas Corrientes
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión integral de clientes, ventas a plazo, cobros parciales y saldos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          {activeTab === 'sales' ? (
            <Button variant="primary" size="sm" onClick={() => setIsSaleModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Venta
            </Button>
          ) : activeTab === 'padron' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingClient(null);
                setIsClientModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo Cliente
            </Button>
          ) : null}
        </div>
      </div>

      {/* Sub-tabs Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ventas a Cta Cte</span>
        </button>

        <button
          onClick={() => setActiveTab('padron')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'padron'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Padrón de Clientes</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Próximos Cobros</span>
          {upcomingSales.length > 0 ? (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 font-bold">
              {upcomingSales.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Estadísticas</span>
        </button>
      </div>

      {/* Error Alert Banner */}
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* TAB 1: VENTAS A CUENTA CORRIENTE */}
      {activeTab === 'sales' ? (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Vendido Cta Cte</p>
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
                    <h4 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 font-mono">
                      {formatCurrency(totalPendingAmount)}
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
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
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, comprobante o #"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Pago parcial">Pago parcial</option>
                <option value="Cobrado">Cobrado</option>
              </select>
            </div>
          </div>

          {/* Sales Table */}
          <ClientSalesTable
            sales={filteredSales}
            isLoading={isLoading}
            onViewDetail={(sale) => setSelectedDetailSale(sale)}
            onDelete={(id) => setDeletingSaleId(id)}
          />
        </div>
      ) : null}

      {/* TAB 2: PADRÓN DE CLIENTES */}
      {activeTab === 'padron' ? (
        <div className="space-y-6">
          <ClientFilters
            searchQuery={clientSearchQuery}
            onSearchChange={setClientSearchQuery}
            selectedStatus={clientSelectedStatus}
            onStatusChange={setClientSelectedStatus}
          />
          <ClientTable
            clients={filteredClients}
            isLoading={isLoading}
            onEdit={(client) => {
              setEditingClient(client);
              setIsClientModalOpen(true);
            }}
            onDelete={(id) => setDeletingClientId(id)}
          />
        </div>
      ) : null}

      {/* TAB 3: PRÓXIMOS COBROS */}
      {activeTab === 'upcoming' ? (
        <ClientUpcomingTable
          sales={upcomingSales}
          isLoading={isLoading}
          onViewDetail={(sale) => setSelectedDetailSale(sale)}
        />
      ) : null}

      {/* TAB 4: ESTADÍSTICAS */}
      {activeTab === 'stats' ? (
        <ClientStatsView stats={stats} isLoading={isLoading} />
      ) : null}

      {/* MODALES */}
      {/* 1. Modal Nueva Venta */}
      <ClientSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSave={handleSaveSale}
        clients={clients}
      />

      {/* 2. Modal Detalle de Venta */}
      <ClientSaleDetailModal
        isOpen={selectedDetailSale !== null}
        onClose={() => setSelectedDetailSale(null)}
        sale={selectedDetailSale}
        onOpenPayment={(sale) => setSelectedPaymentSale(sale)}
      />

      {/* 3. Modal Registrar Cobro */}
      <ClientPaymentModal
        isOpen={selectedPaymentSale !== null}
        onClose={() => setSelectedPaymentSale(null)}
        onSave={handleSavePayment}
        sale={selectedPaymentSale}
      />

      {/* 4. Modal CRUD Cliente (Padrón) */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        client={editingClient}
      />

      {/* 5. Modal Confirmar Eliminación Venta */}
      <ConfirmModal
        isOpen={deletingSaleId !== null}
        onClose={() => setDeletingSaleId(null)}
        onConfirm={handleExecuteDeleteSale}
        title="¿Eliminar venta a cuenta corriente de Supabase?"
        message="Esta acción borrará el registro de la venta y restituirá automáticamente el stock descontado a los productos en Supabase."
        isLoading={isDeleting}
      />

      {/* 6. Modal Confirmar Eliminación Cliente */}
      <ConfirmModal
        isOpen={deletingClientId !== null}
        onClose={() => setDeletingClientId(null)}
        onConfirm={handleExecuteDeleteClient}
        title="¿Eliminar cliente de Supabase?"
        message="Esta operación borrará permanentemente el cliente de la base de datos cloud."
        isLoading={isDeleting}
      />

      {/* Toast Banner */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
