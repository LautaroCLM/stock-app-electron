import { supabase } from '../supabase/client';
import {
  Client,
  ClientFormData,
  ClientSale,
  ClientSaleFormData,
  ClientPayment,
  ClientPaymentFormData,
  ClientStats,
  ClientTopDebtor,
} from '@/types/client';

export const clientWebService = {
  // ── PADRÓN DE CLIENTES ───────────────────────────────────────────────────

  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('[clientWebService] Error al obtener clientes:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async checkDuplicateCuit(cuit: string, excludeId?: number): Promise<boolean> {
    if (!cuit || !cuit.trim()) return false;

    let query = supabase
      .from('clientes')
      .select('id')
      .eq('cuit', cuit.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[clientWebService] Error al verificar CUIT duplicado:', error.message);
      return false;
    }
    return (data && data.length > 0) || false;
  },

  async createClient(clientData: ClientFormData): Promise<Client> {
    if (!clientData.nombre || !clientData.nombre.trim()) {
      throw new Error('El nombre del cliente es obligatorio.');
    }

    if (clientData.cuit && clientData.cuit.trim()) {
      const isDuplicate = await this.checkDuplicateCuit(clientData.cuit.trim());
      if (isDuplicate) {
        throw new Error(`Ya existe otro cliente registrado con el CUIT/DNI "${clientData.cuit.trim()}".`);
      }
    }

    const payload: Partial<Client> = {
      nombre: clientData.nombre.trim(),
      telefono: clientData.telefono?.trim() || '',
      email: clientData.email?.trim() || '',
      direccion: clientData.direccion?.trim() || '',
      cuit: clientData.cuit?.trim() || '',
      observaciones: clientData.observaciones?.trim() || '',
      estado: clientData.estado || 'Activo',
    };

    if (clientData.id) {
      payload.id = Number(clientData.id);
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[clientWebService] Error al crear cliente:', error.message);
      throw new Error(`Error en Supabase al crear cliente: ${error.message}`);
    }
    return data;
  },

  async updateClient(id: number, clientData: Partial<ClientFormData>): Promise<Client> {
    if (clientData.nombre !== undefined && !clientData.nombre.trim()) {
      throw new Error('El nombre del cliente no puede estar vacío.');
    }

    if (clientData.cuit && clientData.cuit.trim()) {
      const isDuplicate = await this.checkDuplicateCuit(clientData.cuit.trim(), id);
      if (isDuplicate) {
        throw new Error(`El CUIT/DNI "${clientData.cuit.trim()}" ya pertenece a otro cliente.`);
      }
    }

    const payload: Partial<Client> = {
      nombre: clientData.nombre?.trim(),
      telefono: clientData.telefono?.trim(),
      email: clientData.email?.trim(),
      direccion: clientData.direccion?.trim(),
      cuit: clientData.cuit?.trim(),
      observaciones: clientData.observaciones?.trim(),
      estado: clientData.estado,
    };

    const { data, error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[clientWebService] Error al actualizar cliente ID ${id}:`, error.message);
      throw new Error(`Error al actualizar cliente: ${error.message}`);
    }
    return data;
  },

  async deleteClient(id: number): Promise<void> {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[clientWebService] Error al eliminar cliente ID ${id}:`, error.message);
      throw new Error(`Error al eliminar cliente: ${error.message}`);
    }
  },

  // ── VENTAS A CUENTA CORRIENTE ──────────────────────────────────────────────

  async getSales(): Promise<ClientSale[]> {
    const { data: sales, error: salesError } = await supabase
      .from('cliente_ventas')
      .select('*, clientes(nombre)')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (salesError) {
      console.error('[clientWebService] Error al obtener ventas:', salesError.message);
      throw new Error(`Error de conexión con Supabase: ${salesError.message}`);
    }

    return (sales || []).map((s: any) => ({
      ...s,
      cliente_nombre: s.clientes?.nombre || `Cliente #${s.cliente_id}`,
    }));
  },

  async createSale(saleData: ClientSaleFormData): Promise<{ success: boolean; id?: number }> {
    if (!saleData.cliente_id) {
      throw new Error('Debes seleccionar un cliente.');
    }
    if (!saleData.productos || saleData.productos.length === 0) {
      throw new Error('Debes agregar al menos un producto a la venta.');
    }
    if (!saleData.total || saleData.total <= 0) {
      throw new Error('El total de la venta debe ser mayor a cero.');
    }

    const payloadItems = saleData.productos.map((item) => ({
      id: Number(item.id),
      codigo: item.codigo || '',
      nombre: item.nombre,
      precio: Number(item.precio || 0),
      cantidad: Number(item.cantidad || 1),
    }));

    // Invocación ATÓMICA a la función RPC PostgreSQL en Supabase
    const { data, error } = await supabase.rpc('procesar_venta_cliente_cta_cte', {
      p_cliente_id: Number(saleData.cliente_id),
      p_fecha: saleData.fecha || new Date().toISOString().split('T')[0],
      p_fecha_estimada_cobro: saleData.fecha_estimada_cobro || null,
      p_comprobante: saleData.comprobante?.trim() || '',
      p_observaciones: saleData.observaciones?.trim() || '',
      p_total: Number(saleData.total),
      p_items: payloadItems,
    });

    const formatStockError = (rawMsg: string): string | null => {
      const match = rawMsg.match(
        /STOCK_INSUFICIENTE:\s*Producto\s+"([^"]+)"\s*(?:\(ID\s*\d+\)\s*)?tiene\s*stock\s*([\d.,]+),\s*pero\s*se\s*solicitaron\s*([\d.,]+)/i
      );
      if (match) {
        const [, productName, stockAvailStr, requestedQtyStr] = match;
        return `Stock insuficiente\n\nNo hay suficiente stock de:\n${productName}\n\nStock disponible: ${stockAvailStr}\nCantidad solicitada: ${requestedQtyStr}`;
      }
      return null;
    };

    if (error) {
      console.error('[clientWebService] Error en RPC procesar_venta_cliente_cta_cte:', error.message);
      const friendly = formatStockError(error.message);
      if (friendly) throw new Error(friendly);
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    if (data && data.success === false) {
      throw new Error(data.error || 'Error al procesar la venta atómica en Supabase.');
    }

    return { success: true, id: data?.id };
  },

  async deleteSale(id: number): Promise<void> {
    // 1. Obtener la venta para restituir stock
    const { data: sale } = await supabase
      .from('cliente_ventas')
      .select('productos')
      .eq('id', id)
      .single();

    if (sale && sale.productos) {
      let prodsList: any[] = [];
      try {
        prodsList = typeof sale.productos === 'string' ? JSON.parse(sale.productos) : sale.productos;
      } catch (e) {}

      for (const p of prodsList) {
        if (p.id && p.cantidad > 0) {
          const { data: prod } = await supabase
            .from('productos')
            .select('stock')
            .eq('id', p.id)
            .single();

          if (prod) {
            const restoredStock = Number(prod.stock || 0) + Number(p.cantidad || 0);
            await supabase
              .from('productos')
              .update({ stock: restoredStock })
              .eq('id', p.id);
          }
        }
      }
    }

    // 2. Eliminar movimientos de cta cte y pagos vinculados
    await supabase.from('cuenta_corriente_cliente').delete().eq('referencia_id', id).eq('tipo', 'Venta');
    await supabase.from('pagos_cliente').delete().eq('venta_id', id);

    // 3. Eliminar la venta
    const { error } = await supabase.from('cliente_ventas').delete().eq('id', id);

    if (error) {
      console.error(`[clientWebService] Error al eliminar venta ID ${id}:`, error.message);
      throw new Error(`Error al eliminar venta: ${error.message}`);
    }
  },

  // ── PAGOS Y COBROS DE CLIENTES ─────────────────────────────────────────────

  async getPayments(ventaId: number, clienteId?: number): Promise<ClientPayment[]> {
    let query = supabase.from('pagos_cliente').select('*');

    if (ventaId) {
      // Filtrado por venta_id relacional o fallback a comprobante
      query = query.or(`venta_id.eq.${ventaId},comprobante.ilike.%Venta #${ventaId}%`);
    } else if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data, error } = await query
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[clientWebService] Error al obtener pagos:', error.message);
      throw new Error(`Error al obtener pagos: ${error.message}`);
    }
    return data || [];
  },

  async createPayment(pagoData: ClientPaymentFormData): Promise<ClientPayment> {
    if (!pagoData.venta_id) {
      throw new Error('ID de venta requerido.');
    }
    if (!pagoData.monto || pagoData.monto <= 0) {
      throw new Error('El monto del cobro debe ser mayor a 0.');
    }

    // 1. Obtener la venta para verificar saldo pendiente
    const { data: sale, error: saleErr } = await supabase
      .from('cliente_ventas')
      .select('total, saldo_pendiente, cliente_id')
      .eq('id', pagoData.venta_id)
      .single();

    if (saleErr || !sale) {
      throw new Error('Venta no encontrada.');
    }

    if (pagoData.monto > Number(sale.saldo_pendiente || 0)) {
      throw new Error(`El monto ($${pagoData.monto}) excede el saldo pendiente ($${sale.saldo_pendiente}).`);
    }

    const payload: Partial<ClientPayment> = {
      cliente_id: Number(sale.cliente_id),
      venta_id: Number(pagoData.venta_id),
      fecha: pagoData.fecha || new Date().toISOString().split('T')[0],
      monto: Number(pagoData.monto),
      metodo_pago: pagoData.metodo_pago || 'Efectivo',
      comprobante: pagoData.comprobante?.trim() || `Recibo Venta #${pagoData.venta_id}`,
      observaciones: pagoData.observaciones?.trim() || '',
    };

    // 2. Insertar cobro en pagos_cliente
    const { data: pago, error: pagoErr } = await supabase
      .from('pagos_cliente')
      .insert(payload)
      .select()
      .single();

    if (pagoErr) {
      console.error('[clientWebService] Error al registrar cobro:', pagoErr.message);
      throw new Error(`Error al registrar cobro: ${pagoErr.message}`);
    }

    // 3. Registrar movimiento de crédito en cuenta_corriente_cliente
    await supabase.from('cuenta_corriente_cliente').insert({
      cliente_id: Number(sale.cliente_id),
      fecha: payload.fecha,
      tipo: 'Pago',
      descripcion: `Pago Venta #${pagoData.venta_id} (${payload.metodo_pago})`,
      debito: 0,
      credito: Number(pagoData.monto),
      referencia_id: pago.id,
    });

    // 4. Recalcular el saldo pendiente y estado de la venta
    await this.recalculateSaleBalance(pagoData.venta_id);

    return pago;
  },

  async recalculateSaleBalance(ventaId: number): Promise<void> {
    const { data: sale } = await supabase
      .from('cliente_ventas')
      .select('total')
      .eq('id', ventaId)
      .single();

    if (!sale) return;

    // Obtener todos los pagos asociados a esta venta
    const payments = await this.getPayments(ventaId);

    const totalPagado = payments.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalVenta = Number(sale.total || 0);
    const nuevoSaldo = Math.max(0, totalVenta - totalPagado);

    let nuevoEstado = 'Pendiente';
    if (nuevoSaldo === 0 && totalVenta > 0) {
      nuevoEstado = 'Cobrado';
    } else if (totalPagado > 0) {
      nuevoEstado = 'Pago parcial';
    }

    await supabase
      .from('cliente_ventas')
      .update({
        saldo_pendiente: nuevoSaldo,
        estado: nuevoEstado,
      })
      .eq('id', ventaId);
  },

  // ── PRÓXIMOS COBROS Y ESTADÍSTICAS ─────────────────────────────────────────

  async getUpcomingCollections(): Promise<ClientSale[]> {
    const { data, error } = await supabase
      .from('cliente_ventas')
      .select('*, clientes(nombre)')
      .gt('saldo_pendiente', 0)
      .order('fecha_estimada_cobro', { ascending: true });

    if (error) {
      console.error('[clientWebService] Error al obtener próximos cobros:', error.message);
      throw new Error(`Error al obtener próximos cobros: ${error.message}`);
    }

    return (data || []).map((s: any) => ({
      ...s,
      cliente_nombre: s.clientes?.nombre || `Cliente #${s.cliente_id}`,
    }));
  },

  async getStats(): Promise<ClientStats> {
    const sales = await this.getSales();
    const clients = await this.getClients();

    let totalVendido = 0;
    let totalPendiente = 0;
    let totalCobrado = 0;
    let cantVentas = sales.length;
    let cantPendientes = 0;
    let cantCobradas = 0;

    const deudaPorCliente = new Map<number, number>();

    sales.forEach((s) => {
      const tot = Number(s.total || 0);
      const sal = Number(s.saldo_pendiente ?? tot);

      totalVendido += tot;
      totalPendiente += sal;
      totalCobrado += Math.max(0, tot - sal);

      if (s.estado === 'Cobrado' || sal === 0) {
        cantCobradas++;
      } else {
        cantPendientes++;
      }

      if (sal > 0) {
        const cur = deudaPorCliente.get(s.cliente_id) || 0;
        deudaPorCliente.set(s.cliente_id, cur + sal);
      }
    });

    const topDeudores: ClientTopDebtor[] = Array.from(deudaPorCliente.entries())
      .map(([clienteId, deuda]) => {
        const cli = clients.find((c) => c.id === clienteId);
        return {
          id: clienteId,
          nombre: cli ? cli.nombre : `Cliente #${clienteId}`,
          telefono: cli?.telefono || '—',
          deuda,
        };
      })
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 5);

    return {
      totalVendido,
      totalCobrado,
      totalPendiente,
      cantVentas,
      cantPendientes,
      cantCobradas,
      topDeudores,
    };
  },
};
