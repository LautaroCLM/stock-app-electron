'use client';

import React from 'react';
import { Star, ArrowDown, Trophy } from 'lucide-react';
import { TopProductReportItem, CategoryReportItem } from '@/types/report';

interface InformesKPIGridProps {
  topProduct: TopProductReportItem | null;
  bottomProduct: TopProductReportItem | null;
  topCategory: CategoryReportItem | null;
}

export const InformesKPIGrid: React.FC<InformesKPIGridProps> = ({
  topProduct,
  bottomProduct,
  topCategory,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Producto estrella (Yellow Card) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 border-l-4 border-l-amber-500 shadow-sm flex items-center space-x-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0">
          <Star className="w-6 h-6 fill-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Producto estrella
          </h3>
          <p
            className="text-base font-bold text-slate-100 truncate mt-0.5"
            title={topProduct ? `${topProduct.nombre} (${topProduct.cantidad} u)` : 'Sin ventas'}
          >
            {topProduct ? topProduct.nombre : 'Sin ventas'}
          </p>
          {topProduct && (
            <p className="text-[11px] font-mono text-amber-400 mt-0.5">
              {topProduct.cantidad} unidades vendidas
            </p>
          )}
        </div>
      </div>

      {/* 2. Menos Vendidos (Red Card) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 border-l-4 border-l-rose-500 shadow-sm flex items-center space-x-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center justify-center shrink-0">
          <ArrowDown className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Menos Vendidos
          </h3>
          <p
            className="text-base font-bold text-slate-100 truncate mt-0.5"
            title={bottomProduct ? `${bottomProduct.nombre} (${bottomProduct.cantidad} u)` : 'Sin ventas'}
          >
            {bottomProduct ? bottomProduct.nombre : 'Sin ventas'}
          </p>
          {bottomProduct && (
            <p className="text-[11px] font-mono text-rose-400 mt-0.5">
              {bottomProduct.cantidad} unidades vendidas
            </p>
          )}
        </div>
      </div>

      {/* 3. Categoría top (Green Card) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 border-l-4 border-l-emerald-500 shadow-sm flex items-center space-x-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Categoría top
          </h3>
          <p
            className="text-base font-bold text-slate-100 truncate mt-0.5"
            title={topCategory ? `${topCategory.categoria} (${topCategory.cantidad} u)` : 'Sin datos'}
          >
            {topCategory ? topCategory.categoria : 'Sin datos'}
          </p>
          {topCategory && (
            <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
              {topCategory.cantidad} u ({topCategory.porcentaje}%)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
