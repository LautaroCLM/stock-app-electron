'use client';

import React from 'react';
import { Product } from '@/types/product';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Trash2, Plus, Box } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onAddToCart?: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  onEdit,
  onDelete,
  onAddToCart,
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando catálogo desde Supabase...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Box className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron productos</p>
        <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o agrega un nuevo producto.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-900/90">
          <TableHead className="w-[100px] text-xs font-bold text-slate-700 dark:text-slate-300">Código</TableHead>
          <TableHead className="min-w-[200px] max-w-[320px] text-xs font-bold text-slate-700 dark:text-slate-300">Producto</TableHead>
          <TableHead className="w-[120px] text-xs font-bold text-slate-700 dark:text-slate-300">Categoría</TableHead>
          <TableHead className="text-center w-[80px] text-xs font-bold text-slate-700 dark:text-slate-300">Stock</TableHead>
          <TableHead className="text-center w-[70px] text-xs font-bold text-slate-700 dark:text-slate-300">Unidad</TableHead>
          <TableHead className="text-right w-[110px] text-xs font-bold text-slate-700 dark:text-slate-300">Precio C</TableHead>
          <TableHead className="text-right w-[110px] text-xs font-bold text-slate-700 dark:text-slate-300">Precio V</TableHead>
          <TableHead className="text-right w-[130px] text-xs font-bold text-slate-700 dark:text-slate-300">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isLowStock = product.stock <= (product.stock_minimo || 5);

          return (
            <TableRow
              key={product.id}
              className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                isLowStock
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-950/50'
                  : 'bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {/* 1. Código */}
              <TableCell className={`font-mono text-xs whitespace-nowrap ${isLowStock ? 'text-rose-700 dark:text-rose-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                {product.codigo || `- #${product.id}`}
              </TableCell>

              {/* 2. Producto (wrapping multilínea activado) */}
              <TableCell className={`font-semibold text-xs leading-snug !whitespace-normal break-words max-w-[220px] sm:max-w-[280px] lg:max-w-[340px] ${isLowStock ? 'text-rose-900 dark:text-rose-200' : 'text-slate-900 dark:text-slate-100'}`}>
                {product.nombre}
              </TableCell>

              {/* 3. Categoría */}
              <TableCell className={`text-xs whitespace-nowrap ${isLowStock ? 'text-rose-700 dark:text-rose-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                {product.categoria || 'General'}
              </TableCell>

              {/* 4. Stock */}
              <TableCell className={`text-center font-bold text-xs whitespace-nowrap ${isLowStock ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>
                {Number(product.stock).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </TableCell>

              {/* 5. Unidad */}
              <TableCell className={`text-center text-xs whitespace-nowrap ${isLowStock ? 'text-rose-700 dark:text-rose-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                {product.unidad || 'un'}
              </TableCell>

              {/* 6. Precio C */}
              <TableCell className={`text-right font-mono text-xs whitespace-nowrap ${isLowStock ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>
                {formatCurrency(product.precio_costo || 0)}
              </TableCell>

              {/* 7. Precio V */}
              <TableCell className={`text-right font-mono font-semibold text-xs whitespace-nowrap ${isLowStock ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>
                {formatCurrency(product.precio || 0)}
              </TableCell>

              {/* 8. Acciones (Botones replicando layout de Electron: Editar arriba, [🗑] [+] abajo) */}
              <TableCell className="text-right whitespace-nowrap py-2">
                <div className="flex flex-col items-end space-y-1">
                  {/* Botón Editar */}
                  <button
                    onClick={() => onEdit(product)}
                    className="w-20 h-7 text-[11px] font-semibold flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-800/80 transition-colors shadow-xs"
                    title="Editar producto"
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </button>

                  {/* Fila de botones Eliminar (🗑) y Agregar al carrito (+) */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onDelete(product.id)}
                      className="w-9 h-7 text-xs flex items-center justify-center rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800/80 transition-colors shadow-xs"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onAddToCart && onAddToCart(product)}
                      className="w-9 h-7 text-xs flex items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800/80 transition-colors shadow-xs"
                      title="Agregar al carrito"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};


