'use client';

import React from 'react';
import { PackageCheck, Trash2, DollarSign, Layers } from 'lucide-react';

interface InformesSummaryGridProps {
  productsEnteredCount: number;
  productsDeletedCount: number;
  totalUnitsSoldCount: number;
  currentTotalStock: number;
}

export const InformesSummaryGrid: React.FC<InformesSummaryGridProps> = ({
  productsEnteredCount,
  productsDeletedCount,
  totalUnitsSoldCount,
  currentTotalStock,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Productos que entraron */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-colors shadow-sm flex items-center space-x-4 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <PackageCheck className="w-5 h-5" />
        </div>
        <div>
          <strong className="text-xs font-semibold text-slate-400 block">
            Productos que entraron
          </strong>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
            {productsEnteredCount.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* 2. Productos borrados */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 transition-colors shadow-sm flex items-center space-x-4 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <strong className="text-xs font-semibold text-slate-400 block">
            Productos borrados
          </strong>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
            {productsDeletedCount.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* 3. Unidades Vendidas */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 transition-colors shadow-sm flex items-center space-x-4 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <strong className="text-xs font-semibold text-slate-400 block">
            Unidades vendidas
          </strong>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
            {totalUnitsSoldCount.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* 4. Stock actual */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-colors shadow-sm flex items-center space-x-4 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <strong className="text-xs font-semibold text-slate-400 block">
            Stock actual total
          </strong>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
            {currentTotalStock.toLocaleString('es-AR')}
          </p>
        </div>
      </div>
    </div>
  );
};
