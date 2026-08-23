'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Client, ClientSaleFormData, ClientSaleItem } from '@/types/client';
import { Product } from '@/types/product';
import { productWebService } from '@/lib/services/productWebService';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Search, Trash2, ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ClientSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: ClientSaleFormData) => Promise<void>;
  clients: Client[];
}

export const ClientSaleModal: React.FC<ClientSaleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [fecha, setFecha] = useState<string>('');
  const [fechaCobro, setFechaCobro] = useState<string>('');
  const [comprobante, setComprobante] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  // Cart & Search State
  const [cart, setCart] = useState<ClientSaleItem[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [searchProdQuery, setSearchProdQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize dates and fetch catalog
  useEffect(() => {
    if (isOpen) {
      const hoy = new Date().toISOString().split('T')[0];
      setFecha(hoy);
      setFechaCobro(hoy);
      setComprobante('');
      setObservaciones('');
      setCart([]);
      setSelectedClientId(clients.length > 0 ? clients[0].id : '');
      setErrorMsg(null);

      productWebService.getProducts()
        .then((prods) => setProductsCatalog(prods))
        .catch((err) => console.error('Error cargando productos:', err));
    }
  }, [isOpen, clients]);

  // Product Autocomplete Filter
  const filteredProducts = useMemo(() => {
    const term = searchProdQuery.toLowerCase().trim();
    if (!term || term.length < 2) return [];
    return productsCatalog.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        (p.codigo && p.codigo.toLowerCase().includes(term))
    ).slice(0, 6);
  }, [productsCatalog, searchProdQuery]);

  // Add Product to Cart
  const handleAddToCart = (prod: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: prod.id,
          codigo: prod.codigo || '',
          nombre: prod.nombre,
          precio: Number(prod.precio || 0),
          cantidad: 1,
        },
      ];
    });
    setSearchProdQuery('');
  };

  // Update Cart Quantity
  const handleQuantityChange = (id: number, qty: number) => {
    const val = Math.max(1, qty);
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, cantidad: val } : item)));
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Total Calculation
  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }, [cart]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedClientId) {
      setErrorMsg('Debes seleccionar un cliente.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Debes agregar al menos un producto a la venta.');
      return;
    }

    // Client-side pre-validation of available stock
    for (const item of cart) {
      const prodInCatalog = productsCatalog.find((p) => p.id === item.id);
      if (prodInCatalog && item.cantidad > (prodInCatalog.stock || 0)) {
        setErrorMsg(
          `Stock insuficiente para "${item.nombre}". Stock disponible: ${prodInCatalog.stock}, solicitado: ${item.cantidad}.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSave({
        cliente_id: Number(selectedClientId),
        fecha,
        fecha_estimada_cobro: fechaCobro || undefined,
        comprobante: comprobante.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        productos: cart,
        total,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar la venta atómica.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Nueva Venta a Cuenta Corriente
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Emisión de entrega a plazo con descuento atómico de stock.
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

        {/* Error Alert */}
        {errorMsg ? (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-2 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="whitespace-pre-line">{errorMsg}</div>
          </div>
        ) : null}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(Number(e.target.value) || '')}
                required
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {clients.length === 0 ? (
                  <option value="">Sin clientes registrados</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.cuit ? `(${c.cuit})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Comprobante */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Comprobante / Remito
              </label>
              <Input
                placeholder="Ej: Remito #0045"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
              />
            </div>

            {/* Fecha Venta */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Venta <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            {/* Fecha Estimada Cobro */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Estimada de Cobro
              </label>
              <Input
                type="date"
                value={fechaCobro}
                onChange={(e) => setFechaCobro(e.target.value)}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones
            </label>
            <Input
              placeholder="Detalles sobre las condiciones de entrega..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Buscador de Productos */}
          <div className="relative pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Buscar y Agregar Productos del Inventario
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Escribe el nombre o código del producto..."
                value={searchProdQuery}
                onChange={(e) => setSearchProdQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Results Dropdown */}
            {filteredProducts.length > 0 ? (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="p-3 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.nombre}</div>
                      <div className="text-[11px] text-slate-400">
                        Cód: {p.codigo || '—'} • Stock disp: <span className="font-semibold text-blue-600 dark:text-blue-400">{p.stock}</span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatCurrency(p.precio)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Carrito Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Productos en esta venta ({cart.length})</span>
              <span>Total: {formatCurrency(total)}</span>
            </div>
            {cart.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay productos agregados. Usa el buscador de arriba para agregar ítems al carrito.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                    <th className="py-2 px-3">Producto</th>
                    <th className="py-2 px-3 text-center">Cantidad</th>
                    <th className="py-2 px-3 text-right">Precio Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                    <th className="py-2 px-3 text-center">Quitar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {item.nombre}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleQuantityChange(item.id!, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.precio)}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">
                        {formatCurrency(item.precio * item.cantidad)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id!)}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
              Total Venta: <span className="text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Procesando RPC...' : 'Confirmar y Entregar Venta'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
