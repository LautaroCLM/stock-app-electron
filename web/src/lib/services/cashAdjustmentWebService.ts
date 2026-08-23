import { supabase } from '../supabase/client';
import { CashAdjustment, CashAdjustmentFormData } from '@/types/cashAdjustment';

export const cashAdjustmentWebService = {
  async getAdjustments(): Promise<CashAdjustment[]> {
    const { data, error } = await supabase
      .from('ajustes_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[cashAdjustmentWebService] Error al obtener ajustes de caja:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }

    return data || [];
  },

  async createAdjustment(adjData: CashAdjustmentFormData): Promise<CashAdjustment> {
    if (!adjData.tipo) {
      throw new Error('El tipo de ajuste es obligatorio.');
    }
    if (!adjData.motivo || !adjData.motivo.trim()) {
      throw new Error('El motivo del ajuste es obligatorio.');
    }
    if (adjData.monto === undefined || isNaN(adjData.monto)) {
      throw new Error('El monto del ajuste debe ser un número válido.');
    }

    const ventaIdNum = adjData.venta_id ? Number(adjData.venta_id) : null;

    // Si es anulación de venta, verificar duplicados y restituir stock de productos
    if (adjData.tipo === 'Venta anulada' && ventaIdNum) {
      const { data: existingAnulled, error: checkErr } = await supabase
        .from('ajustes_caja')
        .select('id')
        .eq('venta_id', ventaIdNum)
        .eq('tipo', 'Venta anulada');

      if (checkErr) {
        console.warn('[cashAdjustmentWebService] Error al verificar anulación previa:', checkErr.message);
      } else if (existingAnulled && existingAnulled.length > 0) {
        throw new Error('Esta venta ya se encuentra anulada.');
      }

      // Obtener el ticket/venta para restituir stock
      const { data: ticketData, error: ticketErr } = await supabase
        .from('tickets')
        .select('productos')
        .eq('id', ventaIdNum)
        .maybeSingle();

      if (!ticketErr && ticketData && ticketData.productos) {
        try {
          const productos = typeof ticketData.productos === 'string' 
            ? JSON.parse(ticketData.productos) 
            : ticketData.productos;

          if (Array.isArray(productos)) {
            for (const p of productos) {
              const cantidad = Number(p.cantidad || 0);
              if (cantidad > 0) {
                if (p.id) {
                  // Obtener stock actual y sumar
                  const { data: prodCurrent } = await supabase
                    .from('productos')
                    .select('stock')
                    .eq('id', p.id)
                    .single();

                  if (prodCurrent) {
                    const newStock = Number(prodCurrent.stock || 0) + cantidad;
                    await supabase
                      .from('productos')
                      .update({ stock: newStock })
                      .eq('id', p.id);
                  }
                } else if (p.nombre) {
                  const { data: prodCurrent } = await supabase
                    .from('productos')
                    .select('id, stock')
                    .eq('nombre', p.nombre)
                    .maybeSingle();

                  if (prodCurrent) {
                    const newStock = Number(prodCurrent.stock || 0) + cantidad;
                    await supabase
                      .from('productos')
                      .update({ stock: newStock })
                      .eq('id', prodCurrent.id);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('[cashAdjustmentWebService] Error devolviendo stock:', e);
        }
      }
    }

    const payload: Partial<CashAdjustment> = {
      fecha: adjData.fecha || new Date().toISOString().replace('T', ' ').substring(0, 19),
      tipo: adjData.tipo,
      motivo: adjData.motivo.trim(),
      monto: Number(adjData.monto || 0),
      observacion: adjData.observacion?.trim() || null,
      venta_id: ventaIdNum,
    };

    if (adjData.id) {
      payload.id = Number(adjData.id);
    }

    const { data, error } = await supabase
      .from('ajustes_caja')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[cashAdjustmentWebService] Error al guardar ajuste de caja:', error.message);
      throw new Error(`Error en Supabase al guardar ajuste: ${error.message}`);
    }

    return data;
  },

  async deleteAdjustment(id: number): Promise<void> {
    const { error } = await supabase
      .from('ajustes_caja')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[cashAdjustmentWebService] Error al eliminar ajuste ID ${id}:`, error.message);
      throw new Error(`Error al eliminar ajuste: ${error.message}`);
    }
  },

  async searchSales(query: string): Promise<Array<{ id: number; total: number; cliente?: string; fecha?: string }>> {
    if (!query || !query.trim()) return [];

    const cleanQ = query.trim().toLowerCase();

    // Intentar buscar por ID exacto de ticket primero
    const parsedId = parseInt(cleanQ.replace('#', ''));
    
    let dbQuery = supabase
      .from('tickets')
      .select('id, total, cliente, fecha')
      .order('id', { ascending: false })
      .limit(10);

    if (!isNaN(parsedId)) {
      dbQuery = dbQuery.eq('id', parsedId);
    } else {
      dbQuery = dbQuery.ilike('cliente', `%${cleanQ}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('[cashAdjustmentWebService] Error al buscar ventas:', error.message);
      return [];
    }

    return (data || []).map(t => ({
      id: t.id,
      total: Number(t.total || 0),
      cliente: t.cliente || 'Consumidor Final',
      fecha: t.fecha ? String(t.fecha).split('T')[0] : '',
    }));
  }
};
