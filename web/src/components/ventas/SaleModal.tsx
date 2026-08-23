'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SaleFormData } from '@/types/sale';
import { Product } from '@/types/product';
import { Client } from '@/types/client';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, SelectOption } from '@/components/ui/SearchableSelect';
import { formatCurrency } from '@/lib/utils';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SaleFormData) => Promise<void>;
  products: Product[];
  clients: Client[];
}

export const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
  clients,
}) => {
  const [formData, setFormData] = useState<SaleFormData>({
    producto_id: null,
    cantidad: 1,
    total: 0,
    cliente: 'Consumidor Final',
    metodo_pago: 'Efectivo',
    fecha: new Date().toISOString().split('T')[0],
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Convert products list to SearchableSelect options
  const productOptions: SelectOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: p.nombre,
      sublabel: `Cód: ${p.codigo || 'S/C'} | Precio: ${formatCurrency(p.precio)} | Stock disponible: ${p.stock}`,
      badge: `Stock: ${p.stock}`,
    }));
  }, [products]);

  // Convert clients list to SearchableSelect options
  const clientOptions: SelectOption[] = useMemo(() => {
    const defaultOpt: SelectOption = { value: 'Consumidor Final', label: 'Consumidor Final', sublabel: 'Venta rápida al mostrador' };
    const list = clients.map((c) => ({
      value: c.nombre,
      label: c.nombre,
      sublabel: c.cuit ? `CUIT/DNI: ${c.cuit}` : c.telefono ? `Tel: ${c.telefono}` : undefined,
    }));
    return [defaultOpt, ...list];
  }, [clients]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        producto_id: null,
        cantidad: 1,
        total: 0,
        cliente: 'Consumidor Final',
        metodo_pago: 'Efectivo',
        fecha: new Date().toISOString().split('T')[0],
      });
      setSelectedProduct(null);
      setFormError(null);
    }
  }, [isOpen]);

  const handleProductSelect = (val: string | number | null) => {
    if (!val) {
      setSelectedProduct(null);
      setFormData((prev) => ({ ...prev, producto_id: null, total: 0 }));
      return;
    }

    const pId = Number(val);
    const prod = products.find((p) => p.id === pId) || null;
    setSelectedProduct(prod);

    const price = prod ? prod.precio || 0 : 0;
    const qty = formData.cantidad || 1;

    setFormData((prev) => ({
      ...prev,
      producto_id: prod ? prod.id : null,
      total: price * qty,
    }));
    setFormError(null);
  };

  const handleQuantityChange = (qtyNum: number) => {
    const qty = Math.max(1, qtyNum);

    // Stock validation
    if (selectedProduct && selectedProduct.stock !== undefined && qty > selectedProduct.stock) {
      setFormError(`Stock insuficiente. Solo hay ${selectedProduct.stock} unidades disponibles del producto "${selectedProduct.nombre}".`);
    } else {
      setFormError(null);
    }

    const price = selectedProduct ? selectedProduct.precio || 0 : 0;

    setFormData((prev) => ({
      ...prev,
      cantidad: qty,
      total: selectedProduct ? price * qty : prev.total,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.total <= 0) {
      setFormError('El total de la venta debe ser mayor a cero.');
      return;
    }
    if (formData.cantidad <= 0) {
      setFormError('La cantidad debe ser mayor a cero.');
      return;
    }

    // Strict stock check before saving
    if (selectedProduct && selectedProduct.stock !== undefined && formData.cantidad > selectedProduct.stock) {
      setFormError(`No se puede concretar la venta. El stock disponible (${selectedProduct.stock}) es menor a la cantidad solicitada (${formData.cantidad}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar la venta.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nueva Venta"
      description="Selecciona el producto del catálogo y cliente desde Supabase para emitir la venta."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <SearchableSelect
          label="Producto del Catálogo"
          options={productOptions}
          value={formData.producto_id}
          onChange={handleProductSelect}
          placeholder="Buscar producto por nombre o código..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Cantidad *"
            type="number"
            min="1"
            max={selectedProduct?.stock ?? undefined}
            value={formData.cantidad}
            onChange={(e) => handleQuantityChange(Number(e.target.value))}
            required
          />

          <Input
            label="Total Facturado ($) *"
            type="number"
            step="0.01"
            min="0"
            value={formData.total}
            onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableSelect
            label="Cliente / Razón Social"
            options={clientOptions}
            value={formData.cliente}
            onChange={(val) => setFormData({ ...formData, cliente: String(val || 'Consumidor Final') })}
            placeholder="Buscar o seleccionar cliente..."
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Método de Pago
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.metodo_pago || 'Efectivo'}
              onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia / Débito</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
            </select>
          </div>
        </div>

        <Input
          label="Fecha de Operación"
          type="date"
          value={formData.fecha?.split('T')[0]}
          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
        />

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirmar Venta
          </Button>
        </div>
      </form>
    </Modal>
  );
};
