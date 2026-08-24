'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { PeriodFilter } from '@/types/finance';
import { FullReportMetrics } from '@/types/report';
import { reportWebService } from '@/lib/services/reportWebService';
import { supabase } from '@/lib/supabase/client';
import { AdminGuard } from '@/components/auth/AdminGuard';

import { InformesHeader } from '@/components/informes/InformesHeader';
import { InformesKPIGrid } from '@/components/informes/InformesKPIGrid';
import { InformesSummaryGrid } from '@/components/informes/InformesSummaryGrid';
import { InformesCharts } from '@/components/informes/InformesCharts';
import { InformesTables } from '@/components/informes/InformesTables';

export default function InformesPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('mes');
  const [customDate, setCustomDate] = useState<string>('');
  const [metrics, setMetrics] = useState<FullReportMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Consulta de métricas a Supabase
  const fetchReportMetrics = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setIsLoading(true);
        setError(null);
        const data = await reportWebService.getReportMetrics(activePeriod, customDate);
        setMetrics(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar los informes desde Supabase.';
        setError(msg);
        console.error('[InformesPage] Error en fetchReportMetrics:', err);
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [activePeriod, customDate]
  );

  // Carga inicial y por cambio de filtros
  useEffect(() => {
    fetchReportMetrics(true);
  }, [fetchReportMetrics]);

  // Suscripción Supabase Realtime a la tabla 'ventas'
  useEffect(() => {
    const channel = supabase
      .channel('realtime:informes_ventas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        () => {
          console.log('[Informes Realtime] Cambio detectado en ventas. Refrescando informes...');
          fetchReportMetrics(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReportMetrics]);

  const handleSearch = () => {
    fetchReportMetrics(true);
  };

  const handleResetDate = () => {
    setCustomDate('');
    setActivePeriod('mes');
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* 1. Encabezado y Filtros de Informes */}
        <InformesHeader
          activePeriod={activePeriod}
          setActivePeriod={(p) => {
            setActivePeriod(p);
            setCustomDate('');
          }}
          customDate={customDate}
          setCustomDate={setCustomDate}
          onSearch={handleSearch}
          onReset={handleResetDate}
          periodLabel={metrics?.periodLabel || 'Cargando...'}
          isLoading={isLoading}
        />

        {/* 2. Feedback de Error */}
        {error ? (
          <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-2xl flex items-center space-x-3 text-red-300 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* 3. Cargando o Contenido */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Generando informes avanzados desde Supabase...</p>
          </div>
        ) : metrics ? (
          <>
            <InformesKPIGrid
              topProduct={metrics.topProduct}
              bottomProduct={metrics.bottomProduct}
              topCategory={metrics.topCategory}
            />
            <InformesSummaryGrid
              productsEnteredCount={metrics.productsEnteredCount}
              productsDeletedCount={metrics.productsDeletedCount}
              totalUnitsSoldCount={metrics.totalUnitsSoldCount}
              currentTotalStock={metrics.currentTotalStock}
            />
            <InformesCharts
              categoryBreakdown={metrics.categoryBreakdown}
              paymentMethodBreakdown={metrics.paymentMethodBreakdown}
            />
            <InformesTables
              mostSoldProducts={metrics.mostSoldProducts}
              leastSoldProducts={metrics.leastSoldProducts}
              lowStockProducts={metrics.lowStockProducts}
              detailedSales={metrics.detailedSales}
            />
          </>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-2 bg-slate-900/50 rounded-3xl border border-slate-800">
            <p className="text-sm font-semibold">No se encontraron datos para el período seleccionado.</p>
            <p className="text-xs text-slate-500">Selecciona otro rango de fechas para consultar los informes.</p>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
