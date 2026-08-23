import { supabase } from '../supabase/client';
import {
  Supplier,
  SupplierFormData,
  Purchase,
  PurchaseFormData,
  Payment,
  PaymentFormData,
  AccountMovement,
  UpcomingDueDate,
  SupplierStats,
} from '@/types/supplier';

export const supplierWebService = {
  // ── PROVEEDORES ───────────────────────────────────────────────────────────

  async getSuppliers(): Promise<Supplier[]> {
    const { data: proveedores, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('razon_social', { ascending: true });

    if (error) {
      console.error('[supplierWebService] Error al obtener proveedores:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }

    if (!proveedores || proveedores.length === 0) {
      return [];
    }

    // Obtener movimientos de cuenta corriente para calcular deudas
    const { data: movimientos } = await supabase
      .from('cuenta_corriente_proveedor')
      .select('proveedor_id, debito, credito');

    // Obtener últimas compras por proveedor
    const { data: compras } = await supabase
      .from('compras_proveedor')
      .select('proveedor_id, fecha')
      .order('fecha', { ascending: false });

    // Mapear deudas
    const deudaMap: Record<number, number> = {};
    if (movimientos) {
      movimientos.forEach((m) => {
        const pid = Number(m.proveedor_id);
        const deb = Number(m.debito || 0);
        const cred = Number(m.credito || 0);
        deudaMap[pid] = (deudaMap[pid] || 0) + (deb - cred);
      });
    }

    // Mapear última compra
    const ultimaCompraMap: Record<number, string> = {};
    if (compras) {
      compras.forEach((c) => {
        const pid = Number(c.proveedor_id);
        if (!ultimaCompraMap[pid] && c.fecha) {
          ultimaCompraMap[pid] = c.fecha;
        }
      });
    }

    return proveedores.map((p) => ({
      ...p,
      deuda_actual: deudaMap[p.id] !== undefined ? deudaMap[p.id] : 0,
      ultima_compra: ultimaCompraMap[p.id] || null,
    }));
  },

  async checkDuplicateCuit(cuit: string, excludeId?: number): Promise<boolean> {
    if (!cuit || !cuit.trim()) return false;

    let query = supabase
      .from('proveedores')
      .select('id')
      .eq('cuit', cuit.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[supplierWebService] Error al verificar CUIT duplicado:', error.message);
      return false;
    }
    return (data && data.length > 0) || false;
  },

  async checkDuplicateRazonSocial(razonSocial: string, excludeId?: number): Promise<boolean> {
    if (!razonSocial || !razonSocial.trim()) return false;

    let query = supabase
      .from('proveedores')
      .select('id')
      .ilike('razon_social', razonSocial.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[supplierWebService] Error al verificar razón social duplicada:', error.message);
      return false;
    }
    return (data && data.length > 0) || false;
  },

  async createSupplier(supplierData: SupplierFormData): Promise<Supplier> {
    if (!supplierData.razon_social || !supplierData.razon_social.trim()) {
      throw new Error('La razón social o nombre de la empresa es obligatorio.');
    }

    const isNameDuplicate = await this.checkDuplicateRazonSocial(supplierData.razon_social.trim());
    if (isNameDuplicate) {
      throw new Error(`Ya existe un proveedor registrado con la razón social "${supplierData.razon_social.trim()}".`);
    }

    if (supplierData.cuit && supplierData.cuit.trim()) {
      const isCuitDuplicate = await this.checkDuplicateCuit(supplierData.cuit.trim());
      if (isCuitDuplicate) {
        throw new Error(`Ya existe un proveedor con el CUIT "${supplierData.cuit.trim()}".`);
      }
    }

    const payload: Partial<Supplier> = {
      razon_social: supplierData.razon_social.trim(),
      contacto: supplierData.contacto?.trim() || '',
      telefono: supplierData.telefono?.trim() || '',
      email: supplierData.email?.trim() || '',
      direccion: supplierData.direccion?.trim() || '',
      ciudad: supplierData.ciudad?.trim() || '',
      provincia: supplierData.provincia?.trim() || '',
      cuit: supplierData.cuit?.trim() || '',
      observaciones: supplierData.observaciones?.trim() || '',
      estado: supplierData.estado || 'Activo',
    };

    if (supplierData.id) {
      payload.id = Number(supplierData.id);
    }

    const { data, error } = await supabase
      .from('proveedores')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supplierWebService] Error al crear proveedor:', error.message);
      throw new Error(`Error en Supabase al crear proveedor: ${error.message}`);
    }

    return {
      ...data,
      deuda_actual: 0,
      ultima_compra: null,
    };
  },

  async updateSupplier(id: number, supplierData: Partial<SupplierFormData>): Promise<Supplier> {
    if (supplierData.razon_social !== undefined && !supplierData.razon_social.trim()) {
      throw new Error('La razón social no puede estar vacía.');
    }

    if (supplierData.razon_social && supplierData.razon_social.trim()) {
      const isNameDuplicate = await this.checkDuplicateRazonSocial(supplierData.razon_social.trim(), id);
      if (isNameDuplicate) {
        throw new Error(`La razón social "${supplierData.razon_social.trim()}" ya pertenece a otro proveedor.`);
      }
    }

    if (supplierData.cuit && supplierData.cuit.trim()) {
      const isCuitDuplicate = await this.checkDuplicateCuit(supplierData.cuit.trim(), id);
      if (isCuitDuplicate) {
        throw new Error(`El CUIT "${supplierData.cuit.trim()}" ya pertenece a otro proveedor.`);
      }
    }

    const payload: Partial<Supplier> = {
      razon_social: supplierData.razon_social?.trim(),
      contacto: supplierData.contacto?.trim(),
      telefono: supplierData.telefono?.trim(),
      email: supplierData.email?.trim(),
      direccion: supplierData.direccion?.trim(),
      ciudad: supplierData.ciudad?.trim(),
      provincia: supplierData.provincia?.trim(),
      cuit: supplierData.cuit?.trim(),
      observaciones: supplierData.observaciones?.trim(),
      estado: supplierData.estado,
    };

    const { data, error } = await supabase
      .from('proveedores')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[supplierWebService] Error al actualizar proveedor ID ${id}:`, error.message);
      throw new Error(`Error al actualizar proveedor: ${error.message}`);
    }

    return data;
  },

  async deleteSupplier(id: number): Promise<void> {
    // Borrar cuenta corriente, compras y pagos vinculados en orden si no hay ON DELETE CASCADE explícito
    await supabase.from('cuenta_corriente_proveedor').delete().eq('proveedor_id', id);
    await supabase.from('pagos_proveedor').delete().eq('proveedor_id', id);
    await supabase.from('compras_proveedor').delete().eq('proveedor_id', id);

    const { error } = await supabase
      .from('proveedores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[supplierWebService] Error al eliminar proveedor ID ${id}:`, error.message);
      throw new Error(`Error al eliminar proveedor: ${error.message}`);
    }
  },

  // ── COMPRAS A PROVEEDORES ──────────────────────────────────────────────────

  async getPurchases(proveedorId?: number): Promise<Purchase[]> {
    let query = supabase
      .from('compras_proveedor')
      .select('*, proveedores:proveedor_id(razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (proveedorId) {
      query = query.eq('proveedor_id', proveedorId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[supplierWebService] Error al obtener compras:', error.message);
      throw new Error(`Error al obtener compras: ${error.message}`);
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      proveedor_id: c.proveedor_id,
      fecha: c.fecha,
      descripcion: c.descripcion,
      total: Number(c.total || 0),
      metodo_pago: c.metodo_pago,
      estado: c.estado,
      observaciones: c.observaciones,
      created_at: c.created_at,
      proveedor_nombre: c.proveedores?.razon_social || `Proveedor #${c.proveedor_id}`,
    }));
  },

  async createPurchase(compraData: PurchaseFormData): Promise<Purchase> {
    if (!compraData.proveedor_id) {
      throw new Error('Debe seleccionar un proveedor.');
    }
    if (!compraData.total || compraData.total <= 0) {
      throw new Error('El total de la compra debe ser mayor a 0.');
    }

    const esCuentaCorriente = compraData.metodo_pago === 'Cuenta corriente';
    const estadoCompra = esCuentaCorriente ? 'Pendiente' : 'Pagado';

    const payload = {
      proveedor_id: Number(compraData.proveedor_id),
      fecha: compraData.fecha || new Date().toISOString().split('T')[0],
      descripcion: compraData.descripcion?.trim() || null,
      total: Number(compraData.total),
      metodo_pago: compraData.metodo_pago || 'Efectivo',
      estado: estadoCompra,
      observaciones: compraData.observaciones?.trim() || null,
    };

    const { data: compra, error } = await supabase
      .from('compras_proveedor')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supplierWebService] Error al registrar compra:', error.message);
      throw new Error(`Error al registrar compra: ${error.message}`);
    }

    // Si es Cuenta Corriente, generar movimiento de débito en cta. cte.
    if (esCuentaCorriente) {
      const movPayload = {
        proveedor_id: Number(compraData.proveedor_id),
        fecha: compraData.fecha || new Date().toISOString().split('T')[0],
        tipo: 'Compra',
        descripcion: compraData.descripcion?.trim() || `Compra #${compra.id}`,
        debito: Number(compraData.total),
        credito: 0,
        referencia_id: compra.id,
        fecha_vencimiento: compraData.fecha_vencimiento || null,
        estado_pago: 'Pendiente',
      };

      const { error: movErr } = await supabase
        .from('cuenta_corriente_proveedor')
        .insert(movPayload);

      if (movErr) {
        console.error('[supplierWebService] Error al crear movimiento cta cte:', movErr.message);
      }
    }

    return compra;
  },

  async deletePurchase(id: number): Promise<void> {
    // Eliminar movimiento cta cte primero
    await supabase
      .from('cuenta_corriente_proveedor')
      .delete()
      .eq('referencia_id', id)
      .eq('tipo', 'Compra');

    const { error } = await supabase
      .from('compras_proveedor')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[supplierWebService] Error al eliminar compra ID ${id}:`, error.message);
      throw new Error(`Error al eliminar compra: ${error.message}`);
    }
  },

  // ── PAGOS A PROVEEDORES ───────────────────────────────────────────────────

  async getPayments(proveedorId?: number): Promise<Payment[]> {
    let query = supabase
      .from('pagos_proveedor')
      .select('*, proveedores:proveedor_id(razon_social)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (proveedorId) {
      query = query.eq('proveedor_id', proveedorId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[supplierWebService] Error al obtener pagos:', error.message);
      throw new Error(`Error al obtener pagos: ${error.message}`);
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      proveedor_id: p.proveedor_id,
      compra_id: p.compra_id,
      fecha: p.fecha,
      monto: Number(p.monto || 0),
      metodo_pago: p.metodo_pago,
      comprobante: p.comprobante,
      observaciones: p.observaciones,
      created_at: p.created_at,
      proveedor_nombre: p.proveedores?.razon_social || `Proveedor #${p.proveedor_id}`,
    }));
  },

  async createPayment(pagoData: PaymentFormData): Promise<Payment> {
    if (!pagoData.proveedor_id) {
      throw new Error('Debe seleccionar un proveedor.');
    }
    if (!pagoData.monto || pagoData.monto <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0.');
    }

    const payload = {
      proveedor_id: Number(pagoData.proveedor_id),
      compra_id: pagoData.compra_id ? Number(pagoData.compra_id) : null,
      fecha: pagoData.fecha || new Date().toISOString().split('T')[0],
      monto: Number(pagoData.monto),
      metodo_pago: pagoData.metodo_pago || 'Efectivo',
      comprobante: pagoData.comprobante?.trim() || null,
      observaciones: pagoData.observaciones?.trim() || null,
    };

    const { data: pago, error } = await supabase
      .from('pagos_proveedor')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supplierWebService] Error al registrar pago:', error.message);
      throw new Error(`Error al registrar pago: ${error.message}`);
    }

    // Registrar crédito en cuenta corriente
    const movPayload = {
      proveedor_id: Number(pagoData.proveedor_id),
      fecha: pagoData.fecha || new Date().toISOString().split('T')[0],
      tipo: 'Pago',
      descripcion: pagoData.observaciones?.trim() || `Pago #${pago.id}`,
      debito: 0,
      credito: Number(pagoData.monto),
      referencia_id: pago.id,
      estado_pago: 'Pagado',
    };

    await supabase.from('cuenta_corriente_proveedor').insert(movPayload);

    // Actualizar estado de la compra si está vinculada
    if (pagoData.compra_id) {
      await this.recalculatePurchaseStatus(pagoData.compra_id);
    }

    return pago;
  },

  async deletePayment(id: number): Promise<void> {
    // Obtener compra_id si existe
    const { data: pago } = await supabase
      .from('pagos_proveedor')
      .select('compra_id')
      .eq('id', id)
      .single();

    // Eliminar movimiento cta cte
    await supabase
      .from('cuenta_corriente_proveedor')
      .delete()
      .eq('referencia_id', id)
      .eq('tipo', 'Pago');

    const { error } = await supabase
      .from('pagos_proveedor')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[supplierWebService] Error al eliminar pago ID ${id}:`, error.message);
      throw new Error(`Error al eliminar pago: ${error.message}`);
    }

    if (pago && pago.compra_id) {
      await this.recalculatePurchaseStatus(pago.compra_id);
    }
  },

  async recalculatePurchaseStatus(compraId: number): Promise<void> {
    const { data: compra } = await supabase
      .from('compras_proveedor')
      .select('total')
      .eq('id', compraId)
      .single();

    if (!compra) return;

    const { data: pagos } = await supabase
      .from('pagos_proveedor')
      .select('monto')
      .eq('compra_id', compraId);

    const totalPagado = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalCompra = Number(compra.total || 0);

    let nuevoEstado = 'Pendiente';
    if (totalPagado >= totalCompra && totalCompra > 0) {
      nuevoEstado = 'Pagado';
    } else if (totalPagado > 0) {
      nuevoEstado = 'Parcial';
    }

    await supabase
      .from('compras_proveedor')
      .update({ estado: nuevoEstado })
      .eq('id', compraId);

    await supabase
      .from('cuenta_corriente_proveedor')
      .update({ estado_pago: nuevoEstado })
      .eq('referencia_id', compraId)
      .eq('tipo', 'Compra');
  },

  // ── CUENTA CORRIENTE ───────────────────────────────────────────────────────

  async getCurrentAccount(proveedorId: number): Promise<AccountMovement[]> {
    const { data, error } = await supabase
      .from('cuenta_corriente_proveedor')
      .select('*')
      .eq('proveedor_id', proveedorId)
      .order('fecha', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[supplierWebService] Error al obtener cuenta corriente:', error.message);
      throw new Error(`Error al obtener cuenta corriente: ${error.message}`);
    }

    let saldo = 0;
    return (data || []).map((r: any) => {
      const deb = Number(r.debito || 0);
      const cred = Number(r.credito || 0);
      saldo += deb - cred;
      return {
        ...r,
        debito: deb,
        credito: cred,
        saldo_acumulado: saldo,
      };
    });
  },

  async addAccountMovement(mov: Partial<AccountMovement>): Promise<AccountMovement> {
    if (!mov.proveedor_id) {
      throw new Error('ID de proveedor requerido.');
    }

    const payload = {
      proveedor_id: Number(mov.proveedor_id),
      fecha: mov.fecha || new Date().toISOString().split('T')[0],
      tipo: mov.tipo || 'Ajuste',
      descripcion: mov.descripcion?.trim() || null,
      debito: Number(mov.debito || 0),
      credito: Number(mov.credito || 0),
      referencia_id: mov.referencia_id ? Number(mov.referencia_id) : null,
      fecha_vencimiento: mov.fecha_vencimiento || null,
      estado_pago: mov.estado_pago || 'Pendiente',
    };

    const { data, error } = await supabase
      .from('cuenta_corriente_proveedor')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supplierWebService] Error al crear movimiento cta cte:', error.message);
      throw new Error(`Error al crear movimiento: ${error.message}`);
    }
    return data;
  },

  // ── ESTADÍSTICAS Y VENCIMIENTOS ──────────────────────────────────────────

  async getSupplierStats(): Promise<SupplierStats> {
    const now = new Date();
    const primerDiaMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const hoy = now.toISOString().split('T')[0];

    const { data: proveedores } = await supabase
      .from('proveedores')
      .select('id')
      .eq('estado', 'Activo');

    const totalProveedores = proveedores?.length || 0;

    const { data: ctaCte } = await supabase
      .from('cuenta_corriente_proveedor')
      .select('debito, credito, fecha_vencimiento, estado_pago, tipo, referencia_id');

    let totalDeuda = 0;
    let deudasVencidas = 0;

    if (ctaCte) {
      ctaCte.forEach((r) => {
        const deb = Number(r.debito || 0);
        const cred = Number(r.credito || 0);
        totalDeuda += deb - cred;

        if (
          r.fecha_vencimiento &&
          r.fecha_vencimiento < hoy &&
          r.estado_pago !== 'Pagado' &&
          r.tipo === 'Compra'
        ) {
          deudasVencidas += deb;
        }
      });
    }

    const { data: compras } = await supabase
      .from('compras_proveedor')
      .select('total, fecha, proveedor_id, proveedores:proveedor_id(razon_social)')
      .gte('fecha', primerDiaMes);

    const comprasMes = (compras || []).reduce((acc, c) => acc + Number(c.total || 0), 0);

    const { data: pagos } = await supabase
      .from('pagos_proveedor')
      .select('monto')
      .gte('fecha', primerDiaMes);

    const pagosMes = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);

    // Mayor proveedor
    const { data: todasLasCompras } = await supabase
      .from('compras_proveedor')
      .select('total, proveedor_id, proveedores:proveedor_id(razon_social)');

    let topProveedor: { razon_social: string; total: number } | null = null;
    if (todasLasCompras && todasLasCompras.length > 0) {
      const totalsMap: Record<string, number> = {};
      todasLasCompras.forEach((c: any) => {
        const name = c.proveedores?.razon_social || `Proveedor #${c.proveedor_id}`;
        totalsMap[name] = (totalsMap[name] || 0) + Number(c.total || 0);
      });

      let maxTotal = 0;
      let maxName = '';
      Object.entries(totalsMap).forEach(([name, tot]) => {
        if (tot > maxTotal) {
          maxTotal = tot;
          maxName = name;
        }
      });

      if (maxName) {
        topProveedor = { razon_social: maxName, total: maxTotal };
      }
    }

    return {
      totalProveedores,
      totalDeuda,
      deudasVencidas,
      comprasMes,
      pagosMes,
      topProveedor,
    };
  },

  async getUpcomingDueDates(): Promise<UpcomingDueDate[]> {
    const { data, error } = await supabase
      .from('cuenta_corriente_proveedor')
      .select('*, proveedores:proveedor_id(razon_social)')
      .not('fecha_vencimiento', 'is', null)
      .neq('estado_pago', 'Pagado')
      .eq('tipo', 'Compra')
      .order('fecha_vencimiento', { ascending: true });

    if (error) {
      console.error('[supplierWebService] Error al obtener vencimientos:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Calcular saldo pendiente restando pagos parciales si existen
    const result: UpcomingDueDate[] = [];
    for (const r of data as any[]) {
      let pagosSum = 0;
      if (r.referencia_id) {
        const { data: pagos } = await supabase
          .from('pagos_proveedor')
          .select('monto')
          .eq('compra_id', r.referencia_id);
        pagosSum = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);
      }

      const debito = Number(r.debito || 0);
      const saldoPendiente = Math.max(0, debito - pagosSum);

      if (saldoPendiente > 0) {
        result.push({
          ...r,
          debito,
          credito: Number(r.credito || 0),
          proveedor_nombre: r.proveedores?.razon_social || `Proveedor #${r.proveedor_id}`,
          saldo_pendiente: saldoPendiente,
        });
      }
    }

    return result;
  },

  async getPendingDebts(proveedorId: number): Promise<UpcomingDueDate[]> {
    const { data, error } = await supabase
      .from('cuenta_corriente_proveedor')
      .select('*, proveedores:proveedor_id(razon_social)')
      .eq('proveedor_id', proveedorId)
      .eq('tipo', 'Compra')
      .neq('estado_pago', 'Pagado')
      .order('fecha', { ascending: true });

    if (error) {
      console.error('[supplierWebService] Error al obtener deudas pendientes:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const result: UpcomingDueDate[] = [];
    for (const r of data as any[]) {
      let pagosSum = 0;
      if (r.referencia_id) {
        const { data: pagos } = await supabase
          .from('pagos_proveedor')
          .select('monto')
          .eq('compra_id', r.referencia_id);
        pagosSum = (pagos || []).reduce((acc, p) => acc + Number(p.monto || 0), 0);
      }

      const debito = Number(r.debito || 0);
      const saldoPendiente = Math.max(0, debito - pagosSum);

      if (saldoPendiente > 0) {
        result.push({
          ...r,
          debito,
          credito: Number(r.credito || 0),
          proveedor_nombre: r.proveedores?.razon_social || `Proveedor #${r.proveedor_id}`,
          saldo_pendiente: saldoPendiente,
        });
      }
    }

    return result;
  },
};

