'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { PeriodFilter } from '@/types/finance';
import {
  HistoryDocumentType,
  GroupedSaleRecord,
  PresupuestoHistoryRecord,
  RemitoHistoryRecord,
  PaginatedHistoryResult,
} from '@/types/history';
import { historyWebService } from '@/lib/services/historyWebService';
import { supabase } from '@/lib/supabase/client';

import { HistorialHeader } from '@/components/historial/HistorialHeader';
import { HistorialTicketsSection } from '@/components/historial/HistorialTicketsSection';
import { HistorialPresupuestosSection } from '@/components/historial/HistorialPresupuestosSection';
import { HistorialRemitosSection } from '@/components/historial/HistorialRemitosSection';
import { HistoryDetailModal } from '@/components/historial/HistoryDetailModal';

export default function HistorialPage() {
  const [documentType, setDocumentType] = useState<HistoryDocumentType>('ventas');
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('mes');
  const [customDate, setCustomDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('todos');
  const [page, setPage] = useState<number>(1);

  const [salesResult, setSalesResult] = useState<PaginatedHistoryResult<GroupedSaleRecord> | null>(null);
  const [presupuestosResult, setPresupuestosResult] = useState<PaginatedHistoryResult<PresupuestoHistoryRecord> | null>(null);
  const [remitosResult, setRemitosResult] = useState<PaginatedHistoryResult<RemitoHistoryRecord> | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<GroupedSaleRecord | PresupuestoHistoryRecord | RemitoHistoryRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Consulta de datos de historial a Supabase según la pestaña y filtros
  const fetchHistory = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setIsLoading(true);
        setError(null);

        const filterParams = {
          period: activePeriod,
          customDate,
          searchQuery,
          paymentMethod,
          page,
          pageSize: 10,
        };

        if (documentType === 'ventas') {
          const res = await historyWebService.getSalesHistory(filterParams);
          setSalesResult(res);
        } else if (documentType === 'presupuestos') {
          const res = await historyWebService.getPresupuestosHistory(filterParams);
          setPresupuestosResult(res);
        } else if (documentType === 'remitos') {
          const res = await historyWebService.getRemitosHistory(filterParams);
          setRemitosResult(res);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al consultar el historial desde Supabase.';
        setError(msg);
        console.error('[HistorialPage] Error en fetchHistory:', err);
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [documentType, activePeriod, customDate, searchQuery, paymentMethod, page]
  );

  // Reiniciar página a 1 al cambiar pestaña o filtros
  useEffect(() => {
    setPage(1);
  }, [documentType, activePeriod, customDate, searchQuery, paymentMethod]);

  // Cargar datos
  useEffect(() => {
    fetchHistory(true);
  }, [fetchHistory]);

  // Suscripción Realtime a Supabase (ventas, presupuestos, remitos)
  useEffect(() => {
    const channel = supabase
      .channel('realtime:historial_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        () => {
          if (documentType === 'ventas') fetchHistory(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presupuestos' },
        () => {
          if (documentType === 'presupuestos') fetchHistory(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'remitos' },
        () => {
          if (documentType === 'remitos') fetchHistory(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentType, fetchHistory]);

  const handleOpenDetail = (record: GroupedSaleRecord | PresupuestoHistoryRecord | RemitoHistoryRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleSearch = () => {
    fetchHistory(true);
  };

  const handleReset = () => {
    setSearchQuery('');
    setCustomDate('');
    setPaymentMethod('todos');
    setActivePeriod('mes');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Barra de Filtros / Pestañas */}
      <HistorialHeader
        documentType={documentType}
        setDocumentType={setDocumentType}
        activePeriod={activePeriod}
        setActivePeriod={setActivePeriod}
        customDate={customDate}
        setCustomDate={setCustomDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onSearch={handleSearch}
        onReset={handleReset}
        isLoading={isLoading}
      />

      {/* ESTADO DE ERROR */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800 rounded-2xl flex items-center justify-between gap-4 text-red-200 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchHistory(true)}
            className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-white rounded-xl transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ESTADO DE CARGA O TABLAS DINÁMICAS */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-900/50 rounded-3xl border border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs font-medium">Cargando datos de historial desde Supabase...</p>
        </div>
      ) : (
        <>
          {documentType === 'ventas' && (
            <HistorialTicketsSection
              paginatedResult={salesResult}
              onPageChange={setPage}
              onSelectRecord={handleOpenDetail}
              isLoading={isLoading}
            />
          )}

          {documentType === 'presupuestos' && (
            <HistorialPresupuestosSection
              paginatedResult={presupuestosResult}
              onPageChange={setPage}
              onSelectRecord={handleOpenDetail}
              isLoading={isLoading}
            />
          )}

          {documentType === 'remitos' && (
            <HistorialRemitosSection
              paginatedResult={remitosResult}
              onPageChange={setPage}
              onSelectRecord={handleOpenDetail}
              isLoading={isLoading}
            />
          )}
        </>
      )}

      {/* Modal de Detalle Interactivo y Reimpresión */}
      <HistoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        documentType={documentType}
        record={selectedRecord}
      />
    </div>
  );
}
