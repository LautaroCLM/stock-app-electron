import { supabase } from '../supabase/client';
import { Remito, RemitoFormData } from '@/types/remito';

export const remitoWebService = {
  async getRemitos(): Promise<Remito[]> {
    const { data, error } = await supabase
      .from('remitos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[remitoWebService] Error al obtener remitos:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async createRemito(remitoData: RemitoFormData): Promise<Remito> {
    if (remitoData.total <= 0 && (!remitoData.productos || (remitoData.productos as any[]).length === 0)) {
      throw new Error('El remito debe contener al menos un producto.');
    }

    const sub = Number(remitoData.subtotal || remitoData.total || 0);
    const desc = Number(remitoData.descuento || 0);
    const rec = Number(remitoData.recargo || 0);
    const tot = Number(remitoData.total || (sub - desc + rec));

    // Utilizar ÚNICAMENTE columnas existentes en public.remitos (sin inventar columnas)
    const payload: Partial<Remito> = {
      fecha: remitoData.fecha || new Date().toISOString(),
      cliente: remitoData.cliente?.trim() || 'Cliente General',
      cuit: remitoData.cuit?.trim() || '',
      telefono: remitoData.telefono?.trim() || '',
      direccion: remitoData.direccion?.trim() || '',
      localidad: remitoData.localidad?.trim() || '',
      metodo_pago: remitoData.metodo_pago || 'Efectivo',
      subtotal: sub,
      descuento: desc,
      recargo: rec,
      total: tot,
      observaciones: remitoData.observaciones?.trim() || '',
      productos: remitoData.productos || [],
    };

    if (remitoData.id) {
      payload.id = Number(remitoData.id);
    }

    const { data, error } = await supabase
      .from('remitos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[remitoWebService] Error al crear remito:', error.message);
      throw new Error(`Error en Supabase al emitir remito: ${error.message}`);
    }
    return data;
  },

  async deleteRemito(id: number): Promise<void> {
    const { error } = await supabase
      .from('remitos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[remitoWebService] Error al eliminar remito ID ${id}:`, error.message);
      throw new Error(`Error al eliminar remito: ${error.message}`);
    }
  },
};
