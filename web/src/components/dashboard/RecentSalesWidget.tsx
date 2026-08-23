'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RecentSaleItem {
  id: number;
  fecha: string;
  total: number;
  cliente: string;
  metodo_pago: string;
  producto_nombre?: string;
}

interface RecentSalesWidgetProps {
  sales: RecentSaleItem[];
  isLoading?: boolean;
}

export const RecentSalesWidget: React.FC<RecentSalesWidgetProps> = ({ sales, isLoading }) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold flex items-center space-x-2">
          <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Últimas Ventas Emitidas</span>
        </CardTitle>
        <Link
          href="/ventas"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
        >
          <span>Ver todas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No hay ventas registradas recientemente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sales.map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-850/50 rounded-lg px-2 transition-colors">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {sale.producto_nombre || 'Venta General'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {sale.cliente} • <span className="font-mono">{formatDate(sale.fecha)}</span>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(sale.total)}
                  </p>
                  <Badge variant="info" className="text-[10px]">
                    {sale.metodo_pago}
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
