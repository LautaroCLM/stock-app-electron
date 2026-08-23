import { supabase } from '../supabase/client';
import {
  MunicipioOrder,
  MunicipioOrderFormData,
  MunicipioPayment,
  MunicipioPaymentFormData,
} from '@/types/municipio';

export const municipioWebService = {
  // ── ÓRDENEN MUNICIPALES ───────────────────────────────────────────────────

  async getOrders(): Promise<MunicipioOrder[]> {
    const { data, error } = await supabase
      .from('municipio_ordenes')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[municipioWebService] Error al obtener órdenes municipales:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async createOrder(orderData: MunicipioOrderFormData): Promise<MunicipioOrder> {
    if (orderData.total <= 0) {
      throw new Error('El monto total de la orden municipal debe ser mayor a cero.');
    }

    const totalNum = Number(orderData.total || 0);

    const payload: Partial<MunicipioOrder> = {
      fecha: orderData.fecha || new Date().toISOString().split('T')[0],
      expediente: orderData.expediente?.trim() || '',
      orden_compra: orderData.orden_compra?.trim() || '',
      fecha_estimada_cobro: orderData.fecha_estimada_cobro || null as any,
      observaciones: orderData.observaciones?.trim() || '',
      total: totalNum,
      saldo_pendiente: orderData.saldo_pendiente !== undefined ? Number(orderData.saldo_pendiente) : totalNum,
      estado: orderData.estado || 'Pendiente',
      productos: orderData.productos || [],
    };

    if (orderData.id) {
      payload.id = Number(orderData.id);
    }

    const { data, error } = await supabase
      .from('municipio_ordenes')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[municipioWebService] Error al crear orden municipal:', error.message);
      throw new Error(`Error en Supabase al crear orden municipal: ${error.message}`);
    }

    // Descontar stock si la orden incluye productos
    if (Array.isArray(orderData.productos)) {
      for (const item of orderData.productos) {
        if (item.id && item.cantidad > 0) {
          const { data: prod } = await supabase
            .from('productos')
            .select('stock')
            .eq('id', item.id)
            .single();

          if (prod) {
            const newStock = Math.max(0, (prod.stock || 0) - item.cantidad);
            await supabase
              .from('productos')
              .update({ stock: newStock })
              .eq('id', item.id);
          }
        }
      }
    }

    return data;
  },

  async updateOrder(id: number, orderData: Partial<MunicipioOrderFormData>): Promise<MunicipioOrder> {
    if (orderData.total !== undefined && orderData.total <= 0) {
      throw new Error('El monto total debe ser un número positivo mayor a cero.');
    }

    const payload: Partial<MunicipioOrder> = {
      fecha: orderData.fecha,
      expediente: orderData.expediente?.trim(),
      orden_compra: orderData.orden_compra?.trim(),
      fecha_estimada_cobro: orderData.fecha_estimada_cobro,
      observaciones: orderData.observaciones?.trim(),
      total: orderData.total !== undefined ? Number(orderData.total) : undefined,
      saldo_pendiente: orderData.saldo_pendiente !== undefined ? Number(orderData.saldo_pendiente) : undefined,
      estado: orderData.estado,
      productos: orderData.productos,
    };

    const { data, error } = await supabase
      .from('municipio_ordenes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[municipioWebService] Error al actualizar orden ID ${id}:`, error.message);
      throw new Error(`Error al actualizar orden: ${error.message}`);
    }
    return data;
  },

  async deleteOrder(id: number): Promise<void> {
    // Eliminar pagos vinculados primero
    await supabase.from('municipio_pagos').delete().eq('orden_id', id);

    const { error } = await supabase
      .from('municipio_ordenes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[municipioWebService] Error al eliminar orden ID ${id}:`, error.message);
      throw new Error(`Error al eliminar orden: ${error.message}`);
    }
  },

  // ── PAGOS / COBROS MUNICIPALES ─────────────────────────────────────────────

  async getPayments(ordenId: number): Promise<MunicipioPayment[]> {
    const { data, error } = await supabase
      .from('municipio_pagos')
      .select('*')
      .eq('orden_id', ordenId)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error(`[municipioWebService] Error al obtener pagos de orden ID ${ordenId}:`, error.message);
      throw new Error(`Error al obtener pagos: ${error.message}`);
    }
    return data || [];
  },

  async createPayment(pagoData: MunicipioPaymentFormData): Promise<MunicipioPayment> {
    if (!pagoData.orden_id) {
      throw new Error('ID de orden municipal requerido.');
    }
    if (!pagoData.monto || pagoData.monto <= 0) {
      throw new Error('El monto del cobro debe ser mayor a 0.');
    }

    const payload = {
      orden_id: Number(pagoData.orden_id),
      fecha: pagoData.fecha || new Date().toISOString().split('T')[0],
      monto: Number(pagoData.monto),
      metodo_pago: pagoData.metodo_pago || 'Transferencia',
      observaciones: pagoData.observaciones?.trim() || null,
    };

    const { data: pago, error } = await supabase
      .from('municipio_pagos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[municipioWebService] Error al registrar cobro municipal:', error.message);
      throw new Error(`Error al registrar cobro: ${error.message}`);
    }

    // Actualizar el saldo pendiente y estado de la orden
    await this.recalculateOrderBalance(pagoData.orden_id);

    return pago;
  },

  async deletePayment(pagoId: number, ordenId: number): Promise<void> {
    const { error } = await supabase
      .from('municipio_pagos')
      .delete()
      .eq('id', pagoId);

    if (error) {
      console.error(`[municipioWebService] Error al eliminar cobro ID ${pagoId}:`, error.message);
      throw new Error(`Error al eliminar cobro: ${error.message}`);
    }

    await this.recalculateOrderBalance(ordenId);
  },

  async recalculateOrderBalance(ordenId: number): Promise<void> {
    const { data: orden } = await supabase
      .from('municipio_ordenes')
      .select('total')
      .eq('id', ordenId)
      .single();

    if (!orden) return;

    const { data: pagos } = await supabase
      .from('municipio_pagos')
      .select('monto')
      .eq('orden_id', ordenId);

    const totalPagado = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalOrden = Number(orden.total || 0);
    const nuevoSaldo = Math.max(0, totalOrden - totalPagado);

    let nuevoEstado = 'Pendiente';
    if (nuevoSaldo === 0 && totalOrden > 0) {
      nuevoEstado = 'Cobrado';
    } else if (totalPagado > 0) {
      nuevoEstado = 'Pago parcial';
    }

    await supabase
      .from('municipio_ordenes')
      .update({
        saldo_pendiente: nuevoSaldo,
        estado: nuevoEstado,
      })
      .eq('id', ordenId);
  },
};

