'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, ArrowRight, Package } from 'lucide-react';
import Link from 'next/link';

interface LowStockItem {
  id: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  codigo?: string;
}

interface LowStockWidgetProps {
  products: LowStockItem[];
  isLoading?: boolean;
}

export const LowStockWidget: React.FC<LowStockWidgetProps> = ({ products, isLoading }) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold flex items-center space-x-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Alertas de Stock Bajo</span>
        </CardTitle>
        <Link
          href="/inventario"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
        >
          <span>Ir a Inventario</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium flex flex-col items-center justify-center space-y-1">
            <Package className="w-6 h-6 text-emerald-500 mb-1" />
            <span>Excelente. Todos los productos superan el stock mínimo.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {p.nombre}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Cód: {p.codigo || 'S/C'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-slate-500">Mín: {p.stock_minimo}</span>
                  <Badge variant="danger" className="font-mono text-xs">
                    Stock: {p.stock}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
