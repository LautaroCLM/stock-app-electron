'use client';

import React, { useState, useEffect } from 'react';
import { ClientSale, ClientPayment, ClientSaleItem } from '@/types/client';
import { clientWebService } from '@/lib/services/clientWebService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { X, DollarSign, Package, CreditCard, Clock } from 'lucide-react';

interface ClientSaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: ClientSale | null;
  onOpenPayment: (sale: ClientSale) => void;
}

export const ClientSaleDetailModal: React.FC<ClientSaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onOpenPayment,
}) => {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      setIsLoadingPayments(true);
      clientWebService
        .getPayments(sale.id, sale.cliente_id)
        .then((data) => setPayments(data))
        .catch((err) => console.error('Error al obtener cobros:', err))
        .finally(() => setIsLoadingPayments(false));
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  let itemsList: ClientSaleItem[] = [];
  try {
    itemsList = typeof sale.productos === 'string' ? JSON.parse(sale.productos) : sale.productos || [];
  } catch (e) {
    itemsList = [];
  }

  const renderBadge = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'cobrado') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
          Cobrado
        </span>
      );
    }
    if (est === 'pago parcial') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
          Pago parcial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
        Pendiente
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Detalle de Venta #{sale.id}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cliente: <span className="font-semibold text-slate-700 dark:text-slate-300">{sale.cliente_nombre}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Fecha Venta</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(sale.fecha)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Estimado Cobro</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {sale.fecha_estimada_cobro ? formatDate(sale.fecha_estimada_cobro) : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Comprobante</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sale.comprobante || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Estado</span>
              <div>{renderBadge(sale.estado)}</div>
            </div>
          </div>

          {/* Observaciones */}
          {sale.observaciones ? (
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-700 dark:text-slate-300">Observaciones:</strong> {sale.observaciones}
            </div>
          ) : null}

          {/* Tabla de Productos Entregados */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center">
              <Package className="w-4 h-4 mr-1.5 text-blue-600" /> Productos Entregados
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-center">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        Sin detalle de productos
                      </td>
                    </tr>
                  ) : (
                    itemsList.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.codigo || '—'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {item.nombre}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.cantidad}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.precio)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatCurrency(item.precio * item.cantidad)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Summary Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Venta: </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {formatCurrency(sale.total)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Saldo Pendiente: </span>
              <span className={`text-sm font-bold font-mono ${sale.saldo_pendiente > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(sale.saldo_pendiente)}
              </span>
            </div>
          </div>

          {/* Historial de Cobros */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center">
                <CreditCard className="w-4 h-4 mr-1.5 text-emerald-600" /> Historial de Cobros Recibidos
              </h4>
              {sale.saldo_pendiente > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenPayment(sale)}
                  className="text-xs"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                  Registrar Cobro
                </Button>
              ) : null}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Método</th>
                    <th className="py-2.5 px-3">Comprobante</th>
                    <th className="py-2.5 px-3 text-right">Monto Cobrado</th>
                    <th className="py-2.5 px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingPayments ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        Cargando cobros...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No hay cobros registrados para esta venta.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-medium">{formatDate(p.fecha)}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          {p.metodo_pago}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{p.comprobante || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.monto)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{p.observaciones || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
