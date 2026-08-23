'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Expense, ExpenseFormData } from '@/types/expense';
import { expenseWebService } from '@/lib/services/expenseWebService';
import { useEntityManager } from '@/hooks/useEntityManager';

import { ExpenseTable } from '@/components/gastos/ExpenseTable';
import { ExpenseModal } from '@/components/gastos/ExpenseModal';
import { ExpenseFilters } from '@/components/gastos/ExpenseFilters';
import { ExpenseStatsModal } from '@/components/gastos/ExpenseStatsModal';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification } from '@/components/ui/ToastNotification';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Plus, RefreshCw, Radio, DollarSign, Calendar, TrendingDown, PieChart } from 'lucide-react';

export default function GastosPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Entity Manager for Gastos (Handles Realtime internally without duplicate channels)
  const getExpensesFn = useCallback(() => expenseWebService.getExpenses(), []);
  const expenseManager = useEntityManager<Expense>('gastos', getExpensesFn);

  // Load Categories on mount
  const loadMeta = useCallback(async () => {
    try {
      const cats = await expenseWebService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.warn('[GastosPage] Error al cargar categorías:', err);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filtered Expenses Memoized
  const filteredExpenses = useMemo(() => {
    return expenseManager.items.filter((e) => {
      const matchSearch =
        !searchQuery ||
        e.concepto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.observacion && e.observacion.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        !selectedCategory || (e.categoria || 'General').toLowerCase() === selectedCategory.toLowerCase();

      const matchStatus = !selectedStatus || (e.estado || 'Pagado') === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [expenseManager.items, searchQuery, selectedCategory, selectedStatus]);

  // KPI Metrics Calculation
  const totalExpensesAmount = useMemo(() => {
    return expenseManager.items.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  }, [expenseManager.items]);

  const currentMonthExpensesAmount = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    return expenseManager.items
      .filter((e) => e.fecha && e.fecha.startsWith(currentMonth))
      .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  }, [expenseManager.items]);

  const pendingExpensesAmount = useMemo(() => {
    return expenseManager.items
      .filter((e) => (e.estado || 'Pagado') === 'Pendiente')
      .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
  }, [expenseManager.items]);

  // Handlers for Save (Create or Update)
  const handleSaveExpense = async (formData: ExpenseFormData) => {
    if (formData.id) {
      const updated = await expenseWebService.updateExpense(formData.id, formData);
      expenseManager.setItems((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      expenseManager.showToast(`Gasto "${updated.concepto}" actualizado correctamente.`, 'success');
    } else {
      const created = await expenseWebService.createExpense(formData);
      expenseManager.setItems((prev) => [created, ...prev]);
      expenseManager.showToast(`Gasto "${created.concepto}" registrado exitosamente.`, 'success');
    }
    loadMeta();
  };

  // Handlers for Deletion
  const handleExecuteDelete = async () => {
    await expenseManager.executeDelete(
      (id) => expenseWebService.deleteExpense(id),
      'Gasto eliminado correctamente de Supabase.'
    );
    loadMeta();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Gastos Operativos
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Realtime Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control de egresos e imprevistos registrado en tiempo real en Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              expenseManager.fetchData(true);
              loadMeta();
            }}
            disabled={expenseManager.isLoading}
            title="Recargar desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${expenseManager.isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatsModalOpen(true)}
            title="Estadísticas por Categoría"
          >
            <PieChart className="w-4 h-4 mr-1.5 text-rose-500" />
            Estadísticas
          </Button>

          <Button variant="primary" size="sm" onClick={expenseManager.openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Gasto
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Histórico</p>
                <h4 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {formatCurrency(totalExpensesAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gastos del Mes</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {formatCurrency(currentMonthExpensesAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendiente de Pago</p>
                <h4 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {formatCurrency(pendingExpensesAmount)}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Registros</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {expenseManager.items.length}
                </h4>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error alert banner */}
      <ErrorAlert error={expenseManager.error} onDismiss={() => expenseManager.setError(null)} />

      {/* Live Filters Bar */}
      <ExpenseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        categories={categories}
      />

      {/* Expense Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        isLoading={expenseManager.isLoading}
        onEdit={expenseManager.openEdit}
        onDelete={expenseManager.openDelete}
      />

      {/* Expense Modal (Create/Edit) */}
      <ExpenseModal
        isOpen={expenseManager.isModalOpen}
        onClose={() => expenseManager.setIsModalOpen(false)}
        onSave={handleSaveExpense}
        expense={expenseManager.editingItem}
        categories={categories}
      />

      {/* Expense Stats Modal */}
      <ExpenseStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={expenseManager.deletingId !== null}
        onClose={() => expenseManager.setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar registro de gasto de Supabase?"
        message="Esta operación borrará permanentemente el comprobante de gasto de la base de datos cloud."
        isLoading={expenseManager.isDeleting}
      />

      {/* Toast Notification Banner */}
      <ToastNotification toast={expenseManager.toast} onClose={expenseManager.hideToast} />
    </div>
  );
}
