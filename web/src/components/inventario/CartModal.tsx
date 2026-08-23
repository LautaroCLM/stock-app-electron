'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types/product';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Receipt,
  Tag,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  Printer,
  Check,
} from 'lucide-react';

export interface CartItem {
  product: Product;
  quantity: number;
}

export type AdjustType = 'discount' | 'surcharge';
export type AdjustMode = 'percent' | 'fixed';
export type PaymentMethod = 'Efectivo' | 'Mercado Pago' | 'Transferencia';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onOpenPrintOptions?: () => void;
  onConfirmSale?: (params: {
    cartItems: CartItem[];
    adjust: { type: AdjustType; mode: AdjustMode; value: number };
    paymentMethod: PaymentMethod;
  }) => Promise<void>;
  isLoadingSale?: boolean;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenPrintOptions,
  onConfirmSale,
  isLoadingSale = false,
}) => {
  // Ajuste (Descuento / Recargo) State
  const [adjustType, setAdjustType] = useState<AdjustType>('discount');
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('percent');
  const [adjustValueInput, setAdjustValueInput] = useState<string>('0');

  // Método de Pago State
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('Efectivo');

  const handleExecuteSale = async () => {
    if (!onConfirmSale || cartItems.length === 0) return;
    await onConfirmSale({
      cartItems,
      adjust: {
        type: adjustType,
        mode: adjustMode,
        value: Math.max(0, parseFloat(adjustValueInput) || 0),
      },
      paymentMethod: selectedPayment,
    });
  };

  // Calculation Logic
  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + (item.product.precio || 0) * item.quantity,
      0
    );
  }, [cartItems]);

  const adjustNumericValue = Math.max(0, parseFloat(adjustValueInput) || 0);

  const calculatedAdjustmentAmount = useMemo(() => {
    if (adjustNumericValue <= 0 || subtotal <= 0) return 0;
    if (adjustMode === 'percent') {
      return (subtotal * adjustNumericValue) / 100;
    }
    return adjustNumericValue;
  }, [subtotal, adjustNumericValue, adjustMode]);

  const finalTotal = useMemo(() => {
    if (adjustType === 'discount') {
      return Math.max(0, subtotal - calculatedAdjustmentAmount);
    } else {
      return subtotal + calculatedAdjustmentAmount;
    }
  }, [subtotal, calculatedAdjustmentAmount, adjustType]);

  const paymentMethods: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode }> = [
    { id: 'Efectivo', label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
    { id: 'Mercado Pago', label: 'Mercado Pago', icon: <Wallet className="w-4 h-4" /> },
    { id: 'Transferencia', label: 'Transferencia', icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      title={
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
              Carrito de Compras
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1">
              Revisa los productos, aplica descuentos y selecciona el comprobante a emitir
            </p>
          </div>
        </div>
      }
    >
      {cartItems.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">
            El carrito está vacío
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Haz clic en el botón <span className="font-bold text-emerald-500">+</span> en la lista de inventario para agregar productos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN: Products Table & Action Buttons */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">Precio</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {cartItems.map(({ product, quantity }) => {
                      const itemSubtotal = (product.precio || 0) * quantity;
                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                              {product.nombre}
                            </p>
                            {product.categoria && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                {product.categoria}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => onUpdateQuantity(product.id, -1)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                                title="Disminuir"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold w-7 text-center py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs">
                                {quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(product.id, 1)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                                title="Aumentar"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatCurrency(product.precio || 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {formatCurrency(itemSubtotal)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => onRemoveItem(product.id)}
                              className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCart}
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Vaciar carrito
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenPrintOptions}
                className="border-blue-500/50 text-blue-500 hover:bg-blue-950/30 font-bold"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Opciones Comprobante
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Resumen & Métodos de Pago */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Card: Resumen de la Venta */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/80">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 uppercase tracking-wide">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  <span>Resumen de Operación</span>
                </h4>
              </div>

              {/* Controles de Descuento / Recargo */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Ajuste (Descuento/Recargo):</span>
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-900 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAdjustType('discount')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        adjustType === 'discount'
                          ? 'bg-red-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      Desc.
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('surcharge')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        adjustType === 'surcharge'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      Rec.
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={adjustValueInput}
                      onChange={(e) => setAdjustValueInput(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-900 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAdjustMode('percent')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        adjustMode === 'percent'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('fixed')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        adjustMode === 'fixed'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      $
                    </button>
                  </div>
                </div>
              </div>

              {/* Selección de Método de Pago */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Método de Pago:</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedPayment(pm.id)}
                      className={`p-2 rounded-xl border text-center text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                        selectedPayment === pm.id
                          ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pm.icon}
                      <span className="text-[11px]">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal bruto:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {calculatedAdjustmentAmount > 0 && (
                  <div
                    className={`flex justify-between font-semibold ${
                      adjustType === 'discount'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }`}
                  >
                    <span>
                      {adjustType === 'discount' ? 'Descuento' : 'Recargo'}{' '}
                      {adjustMode === 'percent' ? `(${adjustNumericValue}%)` : ''}:
                    </span>
                    <span>
                      {adjustType === 'discount' ? '-' : '+'}
                      {formatCurrency(calculatedAdjustmentAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-sans">Total Final:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* BOTÓN CONFIRMAR VENTA */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleExecuteSale}
              disabled={isLoadingSale || cartItems.length === 0}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20"
            >
              {isLoadingSale ? 'Procesando Venta en Supabase...' : 'Confirmar Venta / Ticket ($' + finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 }) + ')'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
