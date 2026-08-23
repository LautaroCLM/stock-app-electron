'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  Upload,
  Download,
  DollarSign,
  Plus,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showLowStock: boolean;
  onToggleLowStock: (show: boolean) => void;
  categories: string[];
  onOpenCreate: () => void;
  onRefresh: () => void;
  onOpenCart: () => void;
  cartCount?: number;
  onImportFileSelect?: (file: File) => void;
  onExportExcel?: () => void;
  onOpenUpdatePrices?: () => void;
  onActionToast?: (message: string) => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  showLowStock,
  onToggleLowStock,
  categories,
  onOpenCreate,
  onRefresh,
  onOpenCart,
  cartCount = 0,
  onImportFileSelect,
  onExportExcel,
  onOpenUpdatePrices,
  onActionToast,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImportFileSelect?.(files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* 1. BUSCADOR PRINCIPAL DEL INVENTARIO */}
      <div className="w-full">
        <Input
          placeholder="Buscar inventario, códigos o proveedores..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={<Search className="w-4 h-4 text-slate-400" />}
          className="w-full"
        />
      </div>

      {/* 2. BARRA DE ACCIONES SUPERIOR EN EL ORDEN SOLICITADO */}
      {/* [ Importar ] [ Exportar ] [ Actualizar Precios ] [ Agregar Producto ] [ Refrescar ] [ Filtros ] [ 🛒 ] */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {/* Cluster Izquierdo de Acciones Masivas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            className="h-9 text-xs dark:bg-slate-800/70 dark:border-slate-700/80 dark:hover:bg-slate-800"
            title="Importar productos desde Excel"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Importar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            className="h-9 text-xs dark:bg-slate-800/70 dark:border-slate-700/80 dark:hover:bg-slate-800"
            title="Exportar catálogo a Excel"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Exportar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenUpdatePrices}
            className="h-9 text-xs dark:bg-slate-800/70 dark:border-slate-700/80 dark:hover:bg-slate-800"
            title="Actualizar precios masivamente"
          >
            <DollarSign className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Actualizar Precios
          </Button>
        </div>

        {/* Cluster Derecho de Acciones Principales y Controles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Destacado "Agregar Producto" */}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreate}
            className="h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            title="Registrar nuevo producto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Agregar Producto
          </Button>

          {/* Botón Refrescar */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-9 px-3 text-xs dark:bg-slate-800/70 dark:border-slate-700/80 dark:hover:bg-slate-800"
            title="Refrescar catálogo desde Supabase"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </Button>

          {/* Botón Filtros (Alterna panel desplegable de categorías y stock bajo) */}
          <Button
            variant={showFilterPanel || selectedCategory || showLowStock ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="h-9 text-xs dark:bg-slate-800/70 dark:border-slate-700/80 dark:hover:bg-slate-800"
            title="Filtros de búsqueda"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filtros
          </Button>

          {/* Botón Carrito con Badge Contador */}
          <button
            onClick={onOpenCart}
            className="relative h-9 px-3 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Abrir carrito"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            {cartCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-scale-in">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* PANEL DESPLEGABLE DE FILTROS (Categorías y Stock Bajo) */}
      {showFilterPanel || selectedCategory || showLowStock ? (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Categoría:</span>
            <select
              className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => onToggleLowStock(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Solo Stock Bajo</span>
          </label>
        </div>
      ) : null}
    </div>
  );
};
