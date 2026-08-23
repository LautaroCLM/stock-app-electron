'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, AlertTriangle, ChevronLeft, ChevronRight, Receipt, ShoppingBag } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TopProductReportItem, LowStockReportItem, DetailedSaleReportItem } from '@/types/report';

interface InformesTablesProps {
  mostSoldProducts: TopProductReportItem[];
  leastSoldProducts: TopProductReportItem[];
  lowStockProducts: LowStockReportItem[];
  detailedSales: DetailedSaleReportItem[];
}

export const InformesTables: React.FC<InformesTablesProps> = ({
  mostSoldProducts,
  leastSoldProducts,
  lowStockProducts,
  detailedSales,
}) => {
  const [reponerPage, setReponerPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const itemsPerPage = 5;
  const salesPerPage = 8;

  // Pagination for Low Stock Table
  const totalReponerPages = Math.max(1, Math.ceil(lowStockProducts.length / itemsPerPage));
  const paginatedReponer = useMemo(() => {
    const start = (reponerPage - 1) * itemsPerPage;
    return lowStockProducts.slice(start, start + itemsPerPage);
  }, [lowStockProducts, reponerPage]);

  // Pagination for Detailed Sales History Table
  const totalSalesPages = Math.max(1, Math.ceil(detailedSales.length / salesPerPage));
  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPerPage;
    return detailedSales.slice(start, start + salesPerPage);
  }, [detailedSales, salesPage]);

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: TABLAS DE RANKING Y ALERTAS DE STOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Más Vendidos */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <ArrowUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Más vendidos
              </h3>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Vendidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mostSoldProducts.length > 0 ? (
                    mostSoldProducts.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200 pr-2 truncate max-w-[180px]" title={row.nombre}>
                          {row.nombre}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                          {row.cantidad} u
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500">
                        Sin datos en el período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 2. Menos Vendidos */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <ArrowDown className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Menos vendidos
              </h3>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Vendidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leastSoldProducts.length > 0 ? (
                    leastSoldProducts.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200 pr-2 truncate max-w-[180px]" title={row.nombre}>
                          {row.nombre}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-rose-400">
                          {row.cantidad} u
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500">
                        Sin datos en el período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Por reponer (stock < 5) */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-800/60 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-amber-800/60 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-300">
                Por reponer (stock bajo)
              </h3>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Stock</th>
                    <th className="pb-2 text-right">Unidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedReponer.length > 0 ? (
                    paginatedReponer.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200 pr-2 truncate max-w-[140px]" title={row.nombre}>
                          {row.nombre}
                        </td>
                        <td className="py-2.5 text-center font-mono font-bold text-rose-400">
                          {row.stock}
                        </td>
                        <td className="py-2.5 text-right text-slate-400">
                          {row.unidad}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-emerald-400 font-medium">
                        Todo el stock está normal
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination controls for Por reponer */}
          {lowStockProducts.length > itemsPerPage && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setReponerPage((p) => Math.max(1, p - 1))}
                disabled={reponerPage === 1}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <span className="font-mono text-[11px]">
                {reponerPage} / {totalReponerPages}
              </span>
              <button
                type="button"
                onClick={() => setReponerPage((p) => Math.min(totalReponerPages, p + 1))}
                disabled={reponerPage >= totalReponerPages}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: DETALLE HISTÓRICO DE VENTAS DEL PERÍODO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-slate-100">
              Detalle de Operaciones Realizadas
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {detailedSales.length} {detailedSales.length === 1 ? 'venta en este período' : 'ventas en este período'}
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="py-3 px-3">ID Venta</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Producto</th>
                <th className="py-3 px-3 text-center">Cantidad</th>
                <th className="py-3 px-3 text-right">Total ($)</th>
                <th className="py-3 px-3">Método Pago</th>
                <th className="py-3 px-3">Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedSales.length > 0 ? (
                paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-400">
                      #{sale.id}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(sale.fecha)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-100 max-w-[200px] truncate" title={sale.producto_nombre}>
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{sale.producto_nombre}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                      {sale.cantidad} u
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {sale.metodo_pago}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[140px]" title={sale.cliente}>
                      {sale.cliente}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron operaciones registradas para el período seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sales Pagination */}
        {detailedSales.length > salesPerPage && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] text-slate-500">
              Mostrando {(salesPage - 1) * salesPerPage + 1} - {Math.min(salesPage * salesPerPage, detailedSales.length)} de {detailedSales.length} ventas
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                disabled={salesPage === 1}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <span className="font-mono text-xs px-2">
                Página {salesPage} de {totalSalesPages}
              </span>
              <button
                type="button"
                onClick={() => setSalesPage((p) => Math.min(totalSalesPages, p + 1))}
                disabled={salesPage >= totalSalesPages}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
