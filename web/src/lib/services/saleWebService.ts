import { supabase } from '../supabase/client';
import { Sale, SaleFormData } from '@/types/sale';
import { Product } from '@/types/product';
import { Client } from '@/types/client';

export const saleWebService = {
  async getSales(): Promise<Sale[]> {
    // Consulta a ventas con relación opcional a productos
    const { data, error } = await supabase
      .from('ventas')
      .select('*, productos(nombre)')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[saleWebService] Error al obtener ventas:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }

    return (data || []).map((s: any) => ({
      ...s,
      producto_nombre: s.productos?.nombre || (s.producto_id ? `Producto #${s.producto_id}` : 'Venta General'),
    }));
  },

  async createSale(saleData: SaleFormData): Promise<Sale> {
    if (saleData.total <= 0) {
      throw new Error('El total de la venta debe ser un número positivo mayor a cero.');
    }
    if (saleData.cantidad <= 0) {
      throw new Error('La cantidad vendida debe ser al menos 1.');
    }

    const payload: Partial<Sale> = {
      producto_id: saleData.producto_id ? Number(saleData.producto_id) : null,
      cantidad: Number(saleData.cantidad || 1),
      total: Number(saleData.total || 0),
      cliente: saleData.cliente?.trim() || 'Consumidor Final',
      metodo_pago: saleData.metodo_pago || 'Efectivo',
      fecha: saleData.fecha || new Date().toISOString(),
    };

    let query;
    if (saleData.id) {
      payload.id = Number(saleData.id);
      query = supabase
        .from('ventas')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
    } else {
      query = supabase
        .from('ventas')
        .insert(payload)
        .select()
        .single();
    }

    const { data, error } = await query;

    if (error) {
      console.error('[saleWebService] Error al registrar venta:', error.message);
      throw new Error(`Error en Supabase al registrar venta: ${error.message}`);
    }

    // Si la venta está asociada a un producto, descontar el stock en Supabase
    if (payload.producto_id) {
      try {
        const { data: prod } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', payload.producto_id)
          .single();

        if (prod) {
          const nuevoStock = Math.max(0, Number(prod.stock || 0) - payload.cantidad!);
          await supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', payload.producto_id);
        }
      } catch (stockErr) {
        console.warn('[saleWebService] No se pudo actualizar el stock del producto:', stockErr);
      }
    }

    return data;
  },

  async deleteSale(id: number): Promise<void> {
    const { error } = await supabase
      .from('ventas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[saleWebService] Error al eliminar venta ID ${id}:`, error.message);
      throw new Error(`Error al eliminar venta: ${error.message}`);
    }
  },

  async getAvailableProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[saleWebService] Error al obtener catálogo de productos:', error.message);
      return [];
    }
    return data || [];
  },

  async getAvailableClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[saleWebService] Error al obtener padrón de clientes:', error.message);
      return [];
    }
    return data || [];
  },

  async processCartSale(params: {
    cartItems: Array<{ product: Product; quantity: number }>;
    adjust: {
      type: 'discount' | 'surcharge';
      mode: 'percent' | 'fixed';
      value: number;
    };
    paymentMethod: string;
  }): Promise<{ success: boolean; totalFinal: number; salesCount: number }> {
    const { cartItems, adjust, paymentMethod } = params;
    if (!cartItems || cartItems.length === 0) {
      throw new Error('El carrito no contiene productos.');
    }

    // 1. Calcular Subtotal Bruto
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.product.precio || 0) * item.quantity,
      0
    );

    // 2. Calcular Ajuste (Descuento / Recargo)
    const adjustValue = Math.max(0, Number(adjust.value || 0));
    let adjustAmount = 0;
    if (adjustValue > 0 && subtotal > 0) {
      adjustAmount = adjust.mode === 'percent' ? (subtotal * adjustValue) / 100 : adjustValue;
    }

    let signedAdjustAmount = 0;
    if (adjust.type === 'discount') {
      signedAdjustAmount = -Math.abs(adjustAmount);
    } else {
      signedAdjustAmount = Math.abs(adjustAmount);
    }

    const totalFinal = Math.max(0, subtotal + signedAdjustAmount);

    // 3. Procesar distribución proporcional de totales centavo por centavo
    let assignedSum = 0;
    const payloadItems: Array<{ producto_id: number; cantidad: number; total: number }> = [];

    for (let i = 0; i < cartItems.length; i++) {
      const { product, quantity } = cartItems[i];
      const isLast = i === cartItems.length - 1;
      const itemSubtotal = (product.precio || 0) * quantity;

      let itemTotal = itemSubtotal;
      if (subtotal > 0 && totalFinal !== subtotal) {
        if (isLast) {
          itemTotal = Math.round((totalFinal - assignedSum) * 100) / 100;
        } else {
          const ratio = itemSubtotal / subtotal;
          itemTotal = Math.round(totalFinal * ratio * 100) / 100;
          assignedSum += itemTotal;
        }
      }

      payloadItems.push({
        producto_id: Number(product.id),
        nombre: product.nombre || product.name || `Producto #${product.id}`,
        precio: Number(product.precio || product.price || (quantity ? itemTotal / quantity : 0)),
        cantidad: Number(quantity || 1),
        total: Number(itemTotal || 0),
      });
    }

    // 4. Invocación ATÓMICA e IDEMPOTENTE a la RPC 'procesar_venta_multiproducto' en Supabase
    const clientTransactionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;

    const { data, error } = await supabase.rpc('procesar_venta_multiproducto', {
      p_items: payloadItems,
      p_metodo_pago: paymentMethod || 'Efectivo',
      p_cliente: 'Consumidor Final',
      p_client_transaction_id: clientTransactionId
    });

    const formatStockError = (rawMsg: string): string | null => {
      const match = rawMsg.match(
        /STOCK_INSUFICIENTE:\s*Producto\s+"([^"]+)"\s*(?:\(ID\s*\d+\)\s*)?tiene\s*stock\s*([\d.,]+),\s*pero\s*se\s*solicitaron\s*([\d.,]+)/i
      );
      if (match) {
        const [, productName, stockAvailStr, requestedQtyStr] = match;
        const stockAvail = parseFloat(stockAvailStr.replace(',', '.'));
        const requestedQty = parseFloat(requestedQtyStr.replace(',', '.'));
        return `Stock insuficiente\n\nNo hay suficiente stock de:\n${productName}\n\nStock disponible: ${stockAvail}\nCantidad solicitada: ${requestedQty}\n\nLa venta no pudo realizarse porque el stock fue actualizado desde otro equipo.`;
      }
      return null;
    };

    if (error) {
      console.error('[saleWebService] Error en RPC procesar_venta_multiproducto:', error.message);
      const friendlyError = formatStockError(error.message);
      if (friendlyError) {
        throw new Error(friendlyError);
      }
      if (error.message.includes('tickets_pkey')) {
        throw new Error('Error de desfasaje de ID en la base de datos (tickets_pkey). Por favor ejecuta el parche SQL en Supabase.');
      }
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    if (data && typeof data === 'object') {
      if (data.success === false || data.error) {
        const errorMsg = data.error || data.message || 'Error al procesar la venta en Supabase.';
        console.error('[saleWebService] RPC procesar_venta_multiproducto rechazó la venta:', errorMsg);
        const friendlyError = formatStockError(String(errorMsg));
        if (friendlyError) {
          throw new Error(friendlyError);
        }
        if (String(errorMsg).includes('tickets_pkey')) {
          throw new Error('Error de desfasaje de ID en la base de datos (tickets_pkey). Por favor ejecuta el parche SQL en Supabase.');
        }
        throw new Error(errorMsg);
      }
    }

    return {
      success: true,
      totalFinal,
      salesCount: cartItems.length,
    };
  }
};
