'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ShoppingCart, Package, Wallet, Users, FileText, Building2 } from 'lucide-react';
import Link from 'next/link';

export const QuickActionsWidget: React.FC = () => {
  const actions = [
    { title: 'Nueva Venta', href: '/ventas', icon: <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60' },
    { title: 'Ver Inventario', href: '/inventario', icon: <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, bg: 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60' },
    { title: 'Registrar Gasto', href: '/gastos', icon: <Wallet className="w-4 h-4 text-rose-600 dark:text-rose-400" />, bg: 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60' },
    { title: 'Padrón Clientes', href: '/clientes', icon: <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' },
    { title: 'Presupuestos', href: '/presupuestos', icon: <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />, bg: 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60' },
    { title: 'Órdenes Municipio', href: '/municipio', icon: <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, bg: 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">Accesos Rápidos</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((act) => (
          <Link
            key={act.title}
            href={act.href}
            className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-1.5 transition-all ${act.bg}`}
          >
            {act.icon}
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{act.title}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};
