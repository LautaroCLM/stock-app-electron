'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Product, ProductFormData } from '@/types/product';
import { productWebService } from '@/lib/services/productWebService';
import { saleWebService } from '@/lib/services/saleWebService';
import { budgetWebService } from '@/lib/services/budgetWebService';
import { remitoWebService } from '@/lib/services/remitoWebService';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { ProductTable } from '@/components/inventario/ProductTable';
import { ProductModal } from '@/components/inventario/ProductModal';
import { ProductFilters } from '@/components/inventario/ProductFilters';
import { CartModal, CartItem, AdjustType, AdjustMode, PaymentMethod } from '@/components/inventario/CartModal';
import type { PrintOptionType } from '@/components/inventario/PrintOptionsModal';
import type { ImportOptions } from '@/components/inventario/ImportOptionsModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastNotification, ToastMessage } from '@/components/ui/ToastNotification';
import { formatCurrency } from '@/lib/utils';

const PrintOptionsModal = dynamic(
  () => import('@/components/inventario/PrintOptionsModal').then((m) => m.PrintOptionsModal),
  { ssr: false }
);
const DocumentClientModal = dynamic(
  () => import('@/components/inventario/DocumentClientModal').then((m) => m.DocumentClientModal),
  { ssr: false }
);
const ImportOptionsModal = dynamic(
  () => import('@/components/inventario/ImportOptionsModal').then((m) => m.ImportOptionsModal),
  { ssr: false }
);
const UpdatePricesModal = dynamic(
  () => import('@/components/inventario/UpdatePricesModal').then((m) => m.UpdatePricesModal),
  { ssr: false }
);
import {
  generateThermalTicketHTML,
  generatePresupuestoHTML,
  generateRemitoHTML,
  PrintItem,
} from '@/lib/utils/printTemplates';

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoadingSale, setIsLoadingSale] = useState(false);

  // Print & Document Modals State
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [isDocumentClientOpen, setIsDocumentClientOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<PrintOptionType>('ticket');

  // Import Options Modal State
  const [isImportOptionsOpen, setIsImportOptionsOpen] = useState(false);
  const [pendingImportItems, setPendingImportItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Update Prices Modal State
  const [isUpdatePricesOpen, setIsUpdatePricesOpen] = useState(false);

  // Confirmation Modal State
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await productWebService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.warn('[inventario] Error al refrescar categorías:', err);
    }
  }, []);

  // Load initial products from Supabase
  const fetchProducts = useCallback(async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setIsLoading(true);
      setError(null);
      const data = await productWebService.getProducts();
      setProducts(data);
      await refreshCategories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con Supabase.';
      setError(message);
      showToast(message, 'error');
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, [refreshCategories]);

  // Supabase Realtime Subscription
  useEffect(() => {
    fetchProducts(true);

    const channel = supabase
      .channel('realtime:productos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {
          console.log('[Realtime Event]', payload.eventType, payload);
          fetchProducts(false);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Status]', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  // Filtered Products Memoized
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.codigo && p.codigo.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        !selectedCategory || p.categoria?.toLowerCase() === selectedCategory.toLowerCase();

      const isLow = p.stock <= (p.stock_minimo || 5);
      const matchLowStock = !showLowStock || isLow;

      return matchSearch && matchCategory && matchLowStock;
    });
  }, [products, searchQuery, selectedCategory, showLowStock]);

  // Open Modal Create / Edit
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleConfirmDeleteOpen = (id: number) => {
    setDeletingId(id);
  };

  const handleExecuteDelete = async () => {
    if (!deletingId) return;

    try {
      setIsDeleting(true);
      const targetId = deletingId;
      setProducts((prev) => prev.filter((p) => p.id !== targetId));

      await productWebService.deleteProduct(targetId);
      showToast('Producto eliminado correctamente de Supabase.', 'success');
      setDeletingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el producto.';
      showToast(message, 'error');
      fetchProducts();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (formData.id) {
      const updated = await productWebService.updateProduct(formData.id, formData);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`Producto "${updated.nombre}" actualizado correctamente.`, 'success');
    } else {
      const created = await productWebService.createProduct(formData);
      setProducts((prev) => [created, ...prev]);
      showToast(`Producto "${created.nombre}" creado exitosamente.`, 'success');
    }
  };

  // Cart Management Handlers
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`"${product.nombre}" agregado al carrito.`, 'success');
  };

  const handleUpdateCartQuantity = (productId: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Producto quitado del carrito.', 'success');
  };

  const handleClearCart = () => {
    setCartItems([]);
    showToast('Carrito vaciado.', 'success');
  };

  // =========================================================================
  // EJECUCIÓN DE VENTAS Y EMISIÓN DE COMPROBANTES (TICKET, PRESUPUESTO, REMITO)
  // =========================================================================

  // 1. FLUJO TICKET: VENTA REAL (Ejecuta RPC procesar_venta_multiproducto y descuenta stock)
  const handleConfirmSale = async (params: {
    cartItems: CartItem[];
    adjust: { type: AdjustType; mode: AdjustMode; value: number };
    paymentMethod: PaymentMethod;
  }) => {
    if (!params.cartItems || params.cartItems.length === 0) {
      showToast('El carrito está vacío.', 'error');
      return;
    }

    // Abrir ventana limpia de impresión ANTES del await para prevenir bloqueos de popup
    const printWindow = window.open('', '_blank', 'width=380,height=650');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
            <div style="text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">🧾</div>
              <div style="font-weight: bold; font-size: 14px;">Procesando venta en Supabase...</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Generando ticket térmico</div>
            </div>
          </body>
        </html>
      `);
    }

    try {
      setIsLoadingSale(true);
      // RPC ATÓMICA DE VENTA: Inserta en public.ventas y descuenta stock de public.productos
      const res = await saleWebService.processCartSale(params);

      // Calcular totales para la impresión del ticket térmico
      const subtotal = params.cartItems.reduce(
        (sum, item) => sum + (item.product.precio || 0) * item.quantity,
        0
      );
      let adjustAmount = 0;
      if (params.adjust.value > 0 && subtotal > 0) {
        adjustAmount =
          params.adjust.mode === 'percent'
            ? (subtotal * params.adjust.value) / 100
            : params.adjust.value;
      }
      const descuento = params.adjust.type === 'discount' ? adjustAmount : 0;
      const recargo = params.adjust.type === 'surcharge' ? adjustAmount : 0;

      const printItems: PrintItem[] = params.cartItems.map((item) => ({
        nombre: item.product.nombre,
        cantidad: item.quantity,
        precio: item.product.precio || 0,
        unidad: item.product.unidad || 'un',
      }));

      const ticketHtml = generateThermalTicketHTML({
        ticketNumber: Date.now().toString().slice(-6),
        fecha: new Date().toISOString(),
        cliente: 'Consumidor Final',
        metodoPago: params.paymentMethod,
        items: printItems,
        subtotal,
        descuento,
        recargo,
        totalFinal: res.totalFinal,
      });

      if (printWindow && !printWindow.closed) {
        printWindow.document.open();
        printWindow.document.write(ticketHtml);
        printWindow.document.close();
      } else {
        const fallbackWindow = window.open('', '_blank', 'width=380,height=650');
        if (fallbackWindow) {
          fallbackWindow.document.write(ticketHtml);
          fallbackWindow.document.close();
        }
      }

      showToast(`Venta confirmada exitosamente ($${res.totalFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}).`, 'success');
      setCartItems([]);
      setIsCartOpen(false);
      fetchProducts(false);
    } catch (err: unknown) {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      const message = err instanceof Error ? err.message : 'Error al procesar la venta.';
      showToast(message, 'error');
    } finally {
      setIsLoadingSale(false);
    }
  };

  // 2. SELECCIÓN EN MODAL IMPRESIÓN
  const handleSelectPrintOption = (option: PrintOptionType) => {
    setSelectedDocumentType(option);
    setIsPrintOptionsOpen(false);

    if (option === 'ticket') {
      if (cartItems.length === 0) {
        showToast('El carrito está vacío.', 'error');
        return;
      }
      // Ejecutar la venta de ticket directamente desde Opciones Comprobante (Venta real / Descuento stock)
      handleConfirmSale({
        cartItems,
        adjust: { type: 'discount', mode: 'percent', value: 0 },
        paymentMethod: 'Efectivo',
      });
    } else {
      // Si elige Presupuesto o Remito, abre el modal de datos de cliente (Cotización/Entrega / SIN descuento stock)
      setIsDocumentClientOpen(true);
    }
  };

  // 3. EMITIR PRESUPUESTO O REMITO (ESTRICTAMENTE SIN DESCUENTO DE STOCK NI REGISTRO DE VENTA)
  const handleConfirmDocumentClient = async (clientData: {
    cliente: string;
    cuit: string;
    direccion: string;
    localidad: string;
    telefono: string;
    observaciones: string;
  }) => {
    if (cartItems.length === 0) {
      showToast('El carrito está vacío.', 'error');
      return;
    }

    // Abrir ventana de impresión de forma síncrona ANTES del await
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
            <div style="text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">📄</div>
              <div style="font-weight: bold; font-size: 14px;">Emitiendo comprobante en Supabase...</div>
            </div>
          </body>
        </html>
      `);
    }

    try {
      setIsLoadingSale(true);

      const subtotal = cartItems.reduce(
        (sum, item) => sum + (item.product.precio || 0) * item.quantity,
        0
      );
      const printItems: PrintItem[] = cartItems.map((item) => ({
        nombre: item.product.nombre,
        cantidad: item.quantity,
        precio: item.product.precio || 0,
        unidad: item.product.unidad || 'un',
      }));

      const nowISO = new Date().toISOString();

      if (selectedDocumentType === 'presupuesto') {
        // Guardar ÚNICAMENTE en public.presupuestos (ESTRICTAMENTE NO ejecuta venta ni descuenta stock)
        const budgetResult = await budgetWebService.createBudget({
          fecha: nowISO,
          cliente: clientData.cliente,
          cuit: clientData.cuit,
          direccion: clientData.direccion,
          localidad: clientData.localidad,
          telefono: clientData.telefono,
          subtotal,
          total: subtotal,
          observaciones: clientData.observaciones,
          productos: printItems,
        });

        const docNum = `P-${String(budgetResult.id).padStart(4, '0')}`;
        const htmlContent = generatePresupuestoHTML({
          documentNumber: docNum,
          fecha: nowISO,
          cliente: clientData.cliente,
          direccion: clientData.direccion,
          localidad: clientData.localidad,
          cuit: clientData.cuit,
          telefono: clientData.telefono,
          observaciones: clientData.observaciones,
          items: printItems,
          subtotal,
          totalFinal: subtotal,
        });

        if (printWindow && !printWindow.closed) {
          printWindow.document.open();
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }

        showToast(`Presupuesto ${docNum} emitido exitosamente.`, 'success');
      } else if (selectedDocumentType === 'remito') {
        // Guardar ÚNICAMENTE en public.remitos (ESTRICTAMENTE NO ejecuta venta ni descuenta stock)
        const remitoResult = await remitoWebService.createRemito({
          fecha: nowISO,
          cliente: clientData.cliente,
          cuit: clientData.cuit,
          direccion: clientData.direccion,
          localidad: clientData.localidad,
          telefono: clientData.telefono,
          metodo_pago: 'Efectivo',
          subtotal,
          total: subtotal,
          observaciones: clientData.observaciones,
          productos: printItems,
        });

        const docNum = `R-${String(remitoResult.id).padStart(4, '0')}`;
        const htmlContent = generateRemitoHTML({
          documentNumber: docNum,
          fecha: nowISO,
          cliente: clientData.cliente,
          direccion: clientData.direccion,
          localidad: clientData.localidad,
          cuit: clientData.cuit,
          telefono: clientData.telefono,
          metodoPago: 'Efectivo',
          observaciones: clientData.observaciones,
          items: printItems,
          subtotal,
          totalFinal: subtotal,
        });

        if (printWindow && !printWindow.closed) {
          printWindow.document.open();
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }

        showToast(`Remito ${docNum} emitido exitosamente.`, 'success');
      }

      setCartItems([]);
      setIsDocumentClientOpen(false);
      setIsCartOpen(false);
    } catch (err: unknown) {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      const message = err instanceof Error ? err.message : 'Error al emitir comprobante.';
      showToast(message, 'error');
    } finally {
      setIsLoadingSale(false);
    }
  };

  // Import Excel Handlers
  const handleImportFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

        if (!rows || rows.length <= 1) {
          showToast('El archivo Excel está vacío o no contiene datos válidos.', 'error');
          return;
        }

        const headers = (rows[0] || []).map((h) =>
          h
            ?.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')
        );

        const rawObjects: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const obj: Record<string, any> = {};
          headers.forEach((header, colIndex) => {
            if (header) {
              obj[header] = row[colIndex] ?? '';
            }
          });
          rawObjects.push(obj);
        }

        const parsePrecioSeguro = (valor: any): number => {
          if (typeof valor === 'number') return valor;
          if (!valor) return 0;
          const str = String(valor).replace(/\$/g, '').replace(/\s/g, '').trim();
          if (str.includes(',') && str.includes('.')) {
            return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
          }
          if (str.includes(',')) {
            return Number(str.replace(',', '.')) || 0;
          }
          return Number(str) || 0;
        };

        const normalized = rawObjects.map((row) => {
          const keys = Object.keys(row);
          const normStr = (s: string) =>
            s
              .toString()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '')
              .replace(/\$/g, '')
              .trim();

          const find = (...candidates: string[]) => {
            const normCandidates = candidates.map(normStr);
            for (const key of keys) {
              if (normCandidates.includes(normStr(key))) {
                return row[key];
              }
            }
            for (const key of keys) {
              if (normStr(key).includes('precio')) {
                return row[key];
              }
            }
            return undefined;
          };

          return {
            codigo: String(find('codigo', 'código', 'code', 'cod') || '').trim(),
            nombre: String(find('nombre', 'name', 'producto') || '').trim(),
            categoria: String(find('categoria', 'category') || '').trim(),
            stock: parseInt(String(find('stock', 'cantidad', 'existencia') || 0), 10) || 0,
            precio: parsePrecioSeguro(
              find('precio', 'price', 'preciov', 'precio v', 'precio venta', 'precio_venta', 'pventa', 'p.venta', 'venta', 'importe')
            ),
            precio_costo: parsePrecioSeguro(
              find('costo', 'cost', 'precio costo', 'precio_costo', 'pcosto', 'p.costo', 'compra', 'precio compra')
            ),
            unidad: String(find('unidad', 'unid', 'medida') || 'un').trim(),
          };
        });

        const toInsert = normalized.filter((r) => r.nombre || r.codigo);
        if (toInsert.length === 0) {
          showToast('No se detectaron productos válidos con código o nombre.', 'error');
          return;
        }

        setPendingImportItems(toInsert);
        setIsImportOptionsOpen(true);
      } catch (err: unknown) {
        console.error('Error leyendo Excel:', err);
        showToast('Error al leer el archivo Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async (options: ImportOptions) => {
    try {
      setIsImporting(true);
      const res = await productWebService.bulkImportProducts(pendingImportItems, options);
      showToast(`Se procesaron ${res.count} productos correctamente desde el Excel.`, 'success');
      setIsImportOptionsOpen(false);
      setPendingImportItems([]);
      await fetchProducts(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al importar productos.';
      showToast(message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Bulk Price Update Handlers
  const handleBulkUpdatePrices = async (data: { percent: number; category: string; priceType: 'venta' | 'costo' }) => {
    try {
      const res = await productWebService.bulkUpdatePrices(data);
      showToast(`Precios actualizados para ${res.count} productos.`, 'success');
      setIsUpdatePricesOpen(false);
      await fetchProducts(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar precios.';
      showToast(message, 'error');
    }
  };

  // Exportar Inventario a Excel (.xlsx) replicando la lógica exacta de Electron
  const handleExportExcel = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        showToast('No hay productos registrados para exportar.', 'error');
        return;
      }

      // Replicar las 9 columnas exactas y el orden de Electron (id, codigo, nombre, categoria, stock, unidad, precio_costo, precio, stock_minimo)
      const exportData = data.map((p) => ({
        id: p.id,
        codigo: p.codigo || '',
        nombre: p.nombre,
        categoria: p.categoria || '',
        stock: Number(p.stock || 0),
        unidad: p.unidad || 'un',
        precio_costo: Number(p.precio_costo || 0),
        precio: Number(p.precio || 0),
        stock_minimo: Number(p.stock_minimo || 5),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

      XLSX.writeFile(workbook, 'inventario.xlsx');
      showToast(`Se exportaron ${exportData.length} productos a inventario.xlsx`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al exportar inventario a Excel.';
      console.error('Error exportando Excel:', err);
      showToast(message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Floating Notification */}
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      {/* Header and Filter Bar */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        showLowStock={showLowStock}
        onToggleLowStock={setShowLowStock}
        categories={categories}
        onOpenCreate={handleOpenCreate}
        onRefresh={() => fetchProducts(true)}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onImportFileSelect={handleImportFileSelect}
        onExportExcel={handleExportExcel}
        onOpenUpdatePrices={() => setIsUpdatePricesOpen(true)}
      />

      {/* Main Table */}
      <ProductTable
        products={filteredProducts}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDeleteOpen}
        onAddToCart={handleAddToCart}
      />

      {/* Modal: Create or Edit Product */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSave={handleSaveProduct}
        onCategoryCreated={refreshCategories}
      />

      {/* Modal: Cart Drawer */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onOpenPrintOptions={() => setIsPrintOptionsOpen(true)}
        onConfirmSale={handleConfirmSale}
        isLoadingSale={isLoadingSale}
      />

      {/* Modal: Print Options (Ticket, Presupuesto, Remito) */}
      <PrintOptionsModal
        isOpen={isPrintOptionsOpen}
        onClose={() => setIsPrintOptionsOpen(false)}
        onSelectOption={handleSelectPrintOption}
      />

      {/* Modal: Client & Document Data for Presupuesto / Remito */}
      <DocumentClientModal
        isOpen={isDocumentClientOpen}
        onClose={() => setIsDocumentClientOpen(false)}
        documentType={selectedDocumentType}
        onConfirm={handleConfirmDocumentClient}
        isLoading={isLoadingSale}
      />

      {/* Modal: Excel Import Options */}
      <ImportOptionsModal
        isOpen={isImportOptionsOpen}
        onClose={() => setIsImportOptionsOpen(false)}
        rowCount={pendingImportItems.length}
        onConfirm={handleConfirmImport}
        isLoading={isImporting}
      />

      {/* Modal: Bulk Price Update */}
      <UpdatePricesModal
        isOpen={isUpdatePricesOpen}
        onClose={() => setIsUpdatePricesOpen(false)}
        categories={categories}
        onConfirm={handleBulkUpdatePrices}
      />

      {/* Modal: Confirm Deletion */}
      <ConfirmModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
        title="¿Eliminar producto de Supabase?"
        message="Esta acción eliminará el producto de la base de datos de Supabase en tiempo real. No se podrá recuperar."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
}
