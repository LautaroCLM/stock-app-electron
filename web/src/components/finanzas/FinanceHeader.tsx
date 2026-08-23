'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Radio, DollarSign } from 'lucide-react';

interface FinanceHeaderProps {
  isLoading: boolean;
  onReload: () => void;
}

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({ isLoading, onReload }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Finanzas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resumen de ventas y rendimiento del negocio
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReload}
          disabled={isLoading}
          title="Recargar datos desde Supabase"
          className="border-slate-300 dark:border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
          <Radio className="w-3 h-3 mr-1.5 animate-pulse" />
          Realtime Supabase
        </span>
      </div>
    </div>
  );
};
