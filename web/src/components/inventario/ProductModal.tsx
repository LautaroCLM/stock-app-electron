'use client';

import React, { useState, useEffect } from 'react';
import { Product, ProductFormData } from '@/types/product';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategorySelect } from './CategorySelect';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
  product?: Product | null;
  categories: string[];
  onCategoryCreated?: (newCategory: string) => Promise<void> | void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
  onCategoryCreated,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    nombre: '',
    codigo: '',
    categoria: 'General',
    stock: 0,
    unidad: 'un',
    precio_costo: 0,
    precio: 0,
    stock_minimo: 5,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        nombre: product.nombre || '',
        codigo: product.codigo || '',
        categoria: product.categoria || 'General',
        stock: product.stock ?? 0,
        unidad: product.unidad || 'un',
        precio_costo: product.precio_costo ?? 0,
        precio: product.precio ?? 0,
        stock_minimo: product.stock_minimo ?? 5,
      });
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        categoria: 'General',
        stock: 0,
        unidad: 'un',
        precio_costo: 0,
        precio: 0,
        stock_minimo: 5,
      });
    }
    setFormError(null);
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (formData.precio < 0 || formData.stock < 0) {
      setFormError('El precio y el stock deben ser números positivos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el producto.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Agregar Producto'}
      description={product ? 'Modifica los datos del producto seleccionado.' : 'Ingresa los datos para registrar un nuevo producto en Supabase.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Código / Código de Barras"
            placeholder="Ej: 779123456"
            value={formData.codigo || ''}
            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
          />

          <Input
            label="Nombre del Producto *"
            placeholder="Ej: Cemento Avellaneda 50kg"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CategorySelect
            value={formData.categoria || 'General'}
            onChange={(selectedCat) => setFormData({ ...formData, categoria: selectedCat })}
            categories={categories}
            onCategoryCreated={onCategoryCreated}
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Stock Actual *"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              required
            />
            <Input
              label="Unidad"
              placeholder="un / kg / m"
              value={formData.unidad || 'un'}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Precio Costo ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.precio_costo}
            onChange={(e) => setFormData({ ...formData, precio_costo: Number(e.target.value) })}
          />

          <Input
            label="Precio Venta ($) *"
            type="number"
            step="0.01"
            min="0"
            value={formData.precio}
            onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
            required
          />

          <Input
            label="Stock Mínimo Alerta"
            type="number"
            min="0"
            value={formData.stock_minimo}
            onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {product ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
