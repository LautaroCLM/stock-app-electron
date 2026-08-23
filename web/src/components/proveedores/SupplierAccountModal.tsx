'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Supplier, AccountMovement } from '@/types/supplier';
import { supplierWebService } from '@/lib/services/supplierWebService';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { FileText, X, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

interface SupplierAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onRefreshParent?: () => void;
}

export const SupplierAccountModal: React.FC<SupplierAccountModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onRefreshParent,
}) => {
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!supplier) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await supplierWebService.getCurrentAccount(supplier.id);
      setMovements(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener la cuenta corriente.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [supplier]);

  useEffect(() => {
    if (isOpen && supplier) {
      fetchAccount();
    }
  }, [isOpen, supplier, fetchAccount]);

  if (!isOpen || !supplier) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  const handleDeleteMovement = async (m: AccountMovement) => {
    if (!confirm(`¿Eliminar movimiento "${m.descripcion || m.tipo}"?`)) return;

    try {
      if (m.tipo === 'Compra' && m.referencia_id) {
        await supplierWebService.deletePurchase(m.referencia_id);
      } else if (m.tipo === 'Pago' && m.referencia_id) {
        await supplierWebService.deletePayment(m.referencia_id);
      } else {
        await supabaseDeleteMovement(m.id);
      }
      fetchAccount();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar movimiento.';
      alert(msg);
    }
  };

  const supabaseDeleteMovement = async (id: number) => {
    const { supabase } = await import('@/lib/supabase/client');
    const { error } = await supabase.from('cuenta_corriente_proveedor').delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  const totalDeuda = movements.length > 0 ? movements[movements.length - 1].saldo_acumulado || 0 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cuenta Corriente — {supplier.razon_social}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Historial completo de débitos, créditos y saldos acumulados.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchAccount} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary banner */}
        <div className="px-6 py-3 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">CUIT</span>
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{supplier.cuit || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Teléfono</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{supplier.telefono || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Estado</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{supplier.estado || 'Activo'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Deuda Actual</span>
            <span className={`font-mono font-bold text-sm ${totalDeuda > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(totalDeuda)}
            </span>
          </div>
        </div>

        {/* Body table */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Cargando movimientos...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sin movimientos registrados</p>
              <p className="text-[11px] text-slate-400">Las compras a cuenta corriente y pagos aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Vto.</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const isCompra = m.tipo === 'Compra';
                  const isPago = m.tipo === 'Pago';

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {m.fecha}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] ${
                          isCompra ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' :
                          isPago ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {m.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                        {m.descripcion || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600 dark:text-red-400">
                        {m.debito > 0 ? formatCurrency(m.debito) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {m.credito > 0 ? formatCurrency(m.credito) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(m.saldo_acumulado || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.estado_pago ? (
                          <Badge variant={m.estado_pago === 'Pagado' ? 'success' : m.estado_pago === 'Parcial' ? 'warning' : 'danger'}>
                            {m.estado_pago}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                        {m.fecha_vencimiento || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMovement(m)}
                          className="p-1 hover:text-red-600 dark:hover:text-red-400"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
