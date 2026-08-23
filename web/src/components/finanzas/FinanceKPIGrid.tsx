'use client';

import React from 'react';
import { DesktopFinanceMetrics } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Sun, CalendarCheck, Receipt, Wallet, TrendingUp, Scale } from 'lucide-react';

interface FinanceKPIGridProps {
  metrics: DesktopFinanceMetrics | null;
  isLoading: boolean;
}

export const FinanceKPIGrid: React.FC<FinanceKPIGridProps> = ({ metrics, isLoading }) => {
  const formatValue = (val?: number) => (val !== undefined ? formatCurrency(val) : '$0.00');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. KPI Principal: Total del Período Seleccionado */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 space-y-2 col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
            Total del período
          </span>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
            {isLoading ? '...' : formatValue(metrics?.totalPeriodSales)}
          </h3>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            {metrics?.periodLabel || 'Total de ventas del día'}
          </p>
        </div>
      </div>

      {/* 2. Ventas Hoy */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-500 shadow-sm space-y-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ventas hoy
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : formatValue(metrics?.todaySales)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ingresos del día actual</p>
        </div>
      </div>

      {/* 3. Ventas del Mes */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-purple-500 shadow-sm space-y-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ventas del mes
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : formatValue(metrics?.monthSales)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ingresos del mes en curso</p>
        </div>
      </div>

      {/* 4. Transacciones / Ventas realizadas */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-500 shadow-sm space-y-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ventas realizadas
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : metrics?.monthSalesCount || 0}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Transacciones del mes</p>
        </div>
      </div>

      {/* 5. Egresos y Gastos Operativos del Mes */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 shadow-sm space-y-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Gastos Operativos (Mes)
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {isLoading ? '...' : formatValue(metrics?.monthExpenses)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Egresos registrados en Supabase</p>
        </div>
      </div>

      {/* 6. Liquidación de Sueldos del Mes */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500 shadow-sm space-y-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Liquidación Sueldos (Mes)
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {isLoading ? '...' : formatValue(metrics?.monthPayrollExpenses)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nómina mensual liquidadas</p>
        </div>
      </div>

      {/* 7. Resultado Neto del Mes (Flujo de caja) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 shadow-sm space-y-2 flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Resultado Neto del Mes (Ganancia Estimada)
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono ${
            (metrics?.monthNetBalance || 0) >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isLoading ? '...' : formatValue(metrics?.monthNetBalance)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cálculo real: Ventas del mes - (Gastos operativos + Liquidación de sueldos)
          </p>
        </div>
      </div>
    </div>
  );
};
