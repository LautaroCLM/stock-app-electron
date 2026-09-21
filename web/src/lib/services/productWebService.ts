import { supabase } from '../supabase/client';
import { Product, ProductFormData } from '@/types/product';
import { categoryWebService } from './categoryWebService';

export const productWebService = {
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('[productWebService] Error al obtener productos:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async checkDuplicateCode(codigo: string, excludeId?: number): Promise<boolean> {
    if (!codigo || !codigo.trim()) return false;

    let query = supabase
      .from('productos')
      .select('id')
      .eq('codigo', codigo.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[productWebService] Error al verificar código duplicado:', error.message);
      return false;
    }
    return (data && data.length > 0) || false;
  },

  async createProduct(productData: ProductFormData): Promise<Product> {
    if (!productData.nombre || !productData.nombre.trim()) {
      throw new Error('El nombre del producto es obligatorio.');
    }

    if (productData.codigo && productData.codigo.trim()) {
      const isDuplicate = await this.checkDuplicateCode(productData.codigo.trim());
      if (isDuplicate) {
        throw new Error(`Ya existe otro producto registrado con el código "${productData.codigo.trim()}".`);
      }
    }

    const payload: Partial<Product> = {
      uuid: productData.uuid || crypto.randomUUID(),
      nombre: productData.nombre.trim(),
      codigo: productData.codigo?.trim() || '',
      categoria: productData.categoria?.trim() || 'General',
      stock: Number(productData.stock || 0),
      unidad: productData.unidad || 'un',
      precio_costo: Number(productData.precio_costo || 0),
      precio: Number(productData.precio || 0),
      stock_minimo: Number(productData.stock_minimo || 5),
    };

    let query;
    if (productData.id) {
      payload.id = Number(productData.id);
      query = supabase
        .from('productos')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
    } else {
      query = supabase
        .from('productos')
        .insert(payload)
        .select()
        .single();
    }

    const { data, error } = await query;

    if (error) {
      console.error('[productWebService] Error al crear producto:', error.message);
      throw new Error(`Error en Supabase al crear producto: ${error.message}`);
    }
    return data;
  },

  async updateProduct(id: number, productData: Partial<ProductFormData>): Promise<Product> {
    if (productData.nombre !== undefined && !productData.nombre.trim()) {
      throw new Error('El nombre del producto no puede estar vacío.');
    }

    if (productData.codigo && productData.codigo.trim()) {
      const isDuplicate = await this.checkDuplicateCode(productData.codigo.trim(), id);
      if (isDuplicate) {
        throw new Error(`El código "${productData.codigo.trim()}" ya pertenece a otro producto.`);
      }
    }

    const payload: Partial<Product> = {
      nombre: productData.nombre?.trim(),
      codigo: productData.codigo?.trim(),
      categoria: productData.categoria?.trim(),
      stock: productData.stock !== undefined ? Number(productData.stock) : undefined,
      unidad: productData.unidad,
      precio_costo: productData.precio_costo !== undefined ? Number(productData.precio_costo) : undefined,
      precio: productData.precio !== undefined ? Number(productData.precio) : undefined,
      stock_minimo: productData.stock_minimo !== undefined ? Number(productData.stock_minimo) : undefined,
    };

    const { data, error } = await supabase
      .from('productos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[productWebService] Error al actualizar producto ID ${id}:`, error.message);
      throw new Error(`Error al actualizar producto: ${error.message}`);
    }
    return data;
  },

  async deleteProduct(id: number): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[productWebService] Error al eliminar producto ID ${id}:`, error.message);
      throw new Error(`Error al eliminar producto: ${error.message}`);
    }
  },

  async getCategories(): Promise<string[]> {
    return categoryWebService.getCategories();
  },

  async bulkImportProducts(
    items: Array<{
      codigo?: string;
      nombre?: string;
      categoria?: string;
      stock?: number;
      precio?: number;
      precio_costo?: number;
      unidad?: string;
    }>,
    options: { stock: boolean; precioVenta: boolean; precioCosto: boolean }
  ): Promise<{ success: boolean; count: number }> {
    if (!items || items.length === 0) return { success: true, count: 0 };

    const existingProducts = await this.getProducts();
    const existingByCode = new Map<string, Product>();
    existingProducts.forEach((p) => {
      if (p.codigo) existingByCode.set(p.codigo.trim(), p);
    });

    let processedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const codigo = String(item.codigo || '').trim();
      const nombre = String(item.nombre || '').trim();

      if (!codigo || !nombre) continue;

      const existing = existingByCode.get(codigo);
      const rowStock = Number(item.stock || 0);
      const rowCosto = Number(item.precio_costo || 0);
      let rowVenta = Number(item.precio || 0);
      if (rowVenta === 0 && rowCosto > 0) {
        rowVenta = rowCosto;
      }

      if (existing) {
        const updatePayload: Partial<Product> = {
          categoria: item.categoria?.trim() || existing.categoria || 'General',
          unidad: item.unidad?.trim() || existing.unidad || 'un',
        };

        if (options.stock) {
          updatePayload.stock = Number(existing.stock || 0) + rowStock;
        }
        if (options.precioCosto) {
          updatePayload.precio_costo = rowCosto;
        }
        if (options.precioVenta) {
          updatePayload.precio = rowVenta;
        }

        const { error } = await supabase
          .from('productos')
          .update(updatePayload)
          .eq('id', existing.id);

        if (error) {
          console.error(`[productWebService] Error al actualizar producto ID ${existing.id}:`, error.message);
        } else {
          processedCount++;
        }
      } else {
        const newProductPayload: Partial<Product> = {
          codigo,
          nombre,
          categoria: item.categoria?.trim() || 'General',
          stock: rowStock,
          unidad: item.unidad?.trim() || 'un',
          precio_costo: rowCosto,
          precio: rowVenta,
          stock_minimo: 5,
        };

        const { error } = await supabase
          .from('productos')
          .insert(newProductPayload);

        if (error) {
          console.error(`[productWebService] Error al insertar producto "${nombre}":`, error.message);
        } else {
          processedCount++;
        }
      }
    }

    return { success: true, count: processedCount };
  },

  async bulkUpdatePrices(params: {
    percent: number;
    category?: string;
    priceType?: 'venta' | 'costo';
  }): Promise<{ success: boolean; count: number }> {
    const products = await this.getProducts();
    const isAllCategories = !params.category || params.category === '__all__';
    const priceType = params.priceType || 'venta';
    const percent = Number(params.percent || 0);

    const targetProducts = products.filter((p) => {
      if (isAllCategories) return true;
      return p.categoria?.toLowerCase() === params.category?.toLowerCase();
    });

    let updatedCount = 0;

    for (const p of targetProducts) {
      const currentPrice = priceType === 'costo' ? Number(p.precio_costo || 0) : Number(p.precio || 0);
      const newPrice = Math.max(0, Math.round(currentPrice * (1 + percent / 100) * 100) / 100);

      const payload = priceType === 'costo' ? { precio_costo: newPrice } : { precio: newPrice };

      const { error } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', p.id);

      if (!error) {
        updatedCount++;
      } else {
        console.error(`[productWebService] Error actualizando precio para ID ${p.id}:`, error.message);
      }
    }

    return { success: true, count: updatedCount };
  }
};
