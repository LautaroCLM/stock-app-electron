'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PieChart,
  Package,
  TrendingUp,
  History,
  UserCheck,
  Truck,
  Building2,
  Droplet,
  Cog,
  Receipt,
  Wallet,
  Calculator,
  X,
  Store,
} from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

const ICON_MAP: Record<string, React.ReactNode> = {
  PieChart: <PieChart className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  History: <History className="w-5 h-5" />,
  UserCheck: <UserCheck className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  Droplet: <Droplet className="w-5 h-5" />,
  Cog: <Cog className="w-5 h-5" />,
  Receipt: <Receipt className="w-5 h-5" />,
  Wallet: <Wallet className="w-5 h-5" />,
  Calculator: <Calculator className="w-5 h-5" />,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const coreItems = NAVIGATION_ITEMS.filter((i) => i.category === 'core');
  const operationsItems = NAVIGATION_ITEMS.filter((i) => i.category === 'operations');

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">Stock App</span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block">Edición Web</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {/* 1. MÓDULOS PRINCIPALES */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Módulos Principales
            </div>
            <nav className="space-y-1">
              {coreItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {ICON_MAP[item.iconName]}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 2. OPERACIONES */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Operaciones
            </div>
            <nav className="space-y-1">
              {operationsItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {ICON_MAP[item.iconName]}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer status indicator */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Sincronización Web</p>
              <p className="text-slate-400 text-[10px]">Preparado Supabase</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
