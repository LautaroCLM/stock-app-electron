import { supabase } from '../supabase/client';
import {
  AtmosfericoService,
  AtmosfericoServiceFormData,
  AtmosfericoPago,
  AtmosfericoPagoFormData,
  AtmosfericoStats,
  UpcomingCollection,
} from '@/types/atmosferico';

export const atmosfericoWebService = {
  // ── SERVICIOS ATMOSFÉRICOS ───────────────────────────────────────────────

  async getServices(): Promise<AtmosfericoService[]> {
    const { data, error } = await supabase
      .from('atmos_ordenes')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[atmosfericoWebService] Error al obtener servicios atmosféricos:', error.message);
      throw new Error(`Error al conectar con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async createService(serviceData: AtmosfericoServiceFormData): Promise<AtmosfericoService> {
    if (!serviceData.cliente?.trim()) {
      throw new Error('El cliente u organismo es obligatorio.');
    }
    if (!serviceData.direccion?.trim()) {
      throw new Error('La dirección del servicio es obligatoria.');
    }
    if (serviceData.monto <= 0) {
      throw new Error('El monto del servicio debe ser mayor a cero.');
    }

    const montoNum = Number(serviceData.monto || 0);

    const payload: Partial<AtmosfericoService> = {
      fecha: serviceData.fecha || new Date().toISOString().split('T')[0],
      cliente: serviceData.cliente.trim(),
      direccion: serviceData.direccion.trim(),
      telefono: serviceData.telefono?.trim() || null as any,
      tipo_servicio: serviceData.tipo_servicio?.trim() || 'Desagote',
      descripcion: serviceData.descripcion?.trim() || '',
      monto: montoNum,
      saldo_pendiente: serviceData.saldo_pendiente !== undefined ? Number(serviceData.saldo_pendiente) : montoNum,
      estado: serviceData.estado || 'Pendiente',
      observaciones: serviceData.observaciones?.trim() || null as any,
      fecha_estimada_cobro: serviceData.fecha_estimada_cobro || null as any,
    };

    if (serviceData.id) {
      payload.id = Number(serviceData.id);
    }

    const { data, error } = await supabase
      .from('atmos_ordenes')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[atmosfericoWebService] Error al crear servicio atmosférico:', error.message);
      throw new Error(`Error en Supabase al crear servicio atmosférico: ${error.message}`);
    }
    return data;
  },

  async updateService(id: number, serviceData: Partial<AtmosfericoServiceFormData>): Promise<AtmosfericoService> {
    if (serviceData.monto !== undefined && serviceData.monto <= 0) {
      throw new Error('El monto del servicio debe ser un número positivo mayor a cero.');
    }

    const payload: Partial<AtmosfericoService> = {
      fecha: serviceData.fecha,
      cliente: serviceData.cliente?.trim(),
      direccion: serviceData.direccion?.trim(),
      telefono: serviceData.telefono?.trim(),
      tipo_servicio: serviceData.tipo_servicio?.trim(),
      descripcion: serviceData.descripcion?.trim(),
      monto: serviceData.monto !== undefined ? Number(serviceData.monto) : undefined,
      saldo_pendiente: serviceData.saldo_pendiente !== undefined ? Number(serviceData.saldo_pendiente) : undefined,
      estado: serviceData.estado,
      observaciones: serviceData.observaciones?.trim(),
      fecha_estimada_cobro: serviceData.fecha_estimada_cobro,
    };

    const { data, error } = await supabase
      .from('atmos_ordenes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[atmosfericoWebService] Error al actualizar servicio ID ${id}:`, error.message);
      throw new Error(`Error al actualizar servicio: ${error.message}`);
    }
    return data;
  },

  async deleteService(id: number): Promise<void> {
    // Borrar cobros vinculados primero
    await supabase.from('atmos_pagos').delete().eq('orden_id', id);

    const { error } = await supabase
      .from('atmos_ordenes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[atmosfericoWebService] Error al eliminar servicio ID ${id}:`, error.message);
      throw new Error(`Error al eliminar servicio: ${error.message}`);
    }
  },

  // ── COBROS Y PAGOS ─────────────────────────────────────────────────────────

  async getPayments(ordenId: number): Promise<AtmosfericoPago[]> {
    const { data, error } = await supabase
      .from('atmos_pagos')
      .select('*')
      .eq('orden_id', ordenId)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error(`[atmosfericoWebService] Error al consultar cobros de servicio ID ${ordenId}:`, error.message);
      throw new Error(`Error al obtener cobros: ${error.message}`);
    }
    return data || [];
  },

  async createPayment(pagoData: AtmosfericoPagoFormData): Promise<AtmosfericoPago> {
    if (!pagoData.orden_id) {
      throw new Error('ID de servicio atmosférico requerido.');
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
      .from('atmos_pagos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[atmosfericoWebService] Error al registrar cobro:', error.message);
      throw new Error(`Error al registrar cobro: ${error.message}`);
    }

    await this.recalculateServiceBalance(pagoData.orden_id);

    return pago;
  },

  async deletePayment(pagoId: number, ordenId: number): Promise<void> {
    const { error } = await supabase
      .from('atmos_pagos')
      .delete()
      .eq('id', pagoId);

    if (error) {
      console.error(`[atmosfericoWebService] Error al eliminar cobro ID ${pagoId}:`, error.message);
      throw new Error(`Error al eliminar cobro: ${error.message}`);
    }

    await this.recalculateServiceBalance(ordenId);
  },

  async recalculateServiceBalance(ordenId: number): Promise<void> {
    const { data: servicio } = await supabase
      .from('atmos_ordenes')
      .select('monto')
      .eq('id', ordenId)
      .single();

    if (!servicio) return;

    const { data: pagos } = await supabase
      .from('atmos_pagos')
      .select('monto')
      .eq('orden_id', ordenId);

    const totalPagado = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const montoServicio = Number(servicio.monto || 0);
    const nuevoSaldo = Math.max(0, montoServicio - totalPagado);

    let nuevoEstado = 'Pendiente';
    if (nuevoSaldo === 0 && montoServicio > 0) {
      nuevoEstado = 'Cobrado';
    } else if (totalPagado > 0) {
      nuevoEstado = 'Pago parcial';
    }

    await supabase
      .from('atmos_ordenes')
      .update({
        saldo_pendiente: nuevoSaldo,
        estado: nuevoEstado,
      })
      .eq('id', ordenId);
  },

  // ── PRÓXIMOS COBROS Y ESTADÍSTICAS ─────────────────────────────────────────

  async getUpcomingCollections(): Promise<UpcomingCollection[]> {
    const { data, error } = await supabase
      .from('atmos_ordenes')
      .select('id, fecha, cliente, direccion, monto, saldo_pendiente, fecha_estimada_cobro, estado')
      .gt('saldo_pendiente', 0)
      .order('fecha_estimada_cobro', { ascending: true });

    if (error) {
      console.error('[atmosfericoWebService] Error al obtener próximos cobros:', error.message);
      throw new Error(`Error al obtener cobros pendientes: ${error.message}`);
    }
    return data || [];
  },

  async getStats(): Promise<AtmosfericoStats> {
    const { data: ordenes, error } = await supabase
      .from('atmos_ordenes')
      .select('monto, saldo_pendiente, estado');

    if (error) {
      console.error('[atmosfericoWebService] Error al calcular estadísticas:', error.message);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    const totalVendido = (ordenes || []).reduce((acc, o) => acc + Number(o.monto || 0), 0);
    const totalPendiente = (ordenes || []).reduce((acc, o) => acc + Number(o.saldo_pendiente || 0), 0);
    const totalCobrado = Math.max(0, totalVendido - totalPendiente);

    const cantOrdenes = ordenes?.length || 0;
    const cantCobradas = (ordenes || []).filter(o => o.estado === 'Cobrado' || Number(o.saldo_pendiente || 0) === 0).length;
    const cantPendientes = Math.max(0, cantOrdenes - cantCobradas);

    return {
      totalVendido,
      totalPendiente,
      totalCobrado,
      cantOrdenes,
      cantPendientes,
      cantCobradas,
    };
  },
};
