import { supabase } from '../supabase/client';
import { Budget, BudgetFormData } from '@/types/budget';

export const budgetWebService = {
  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[budgetWebService] Error al obtener presupuestos:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async createBudget(budgetData: BudgetFormData): Promise<Budget> {
    if (budgetData.total <= 0 && (!budgetData.productos || (budgetData.productos as any[]).length === 0)) {
      throw new Error('El presupuesto debe contener al menos un producto.');
    }

    const sub = Number(budgetData.subtotal || budgetData.total || 0);
    const desc = Number(budgetData.descuento || 0);
    const rec = Number(budgetData.recargo || 0);
    const tot = Number(budgetData.total || (sub - desc + rec));

    // Utilizar ÚNICAMENTE columnas existentes en public.presupuestos
    const payload: Partial<Budget> = {
      fecha: budgetData.fecha || new Date().toISOString(),
      cliente: budgetData.cliente?.trim() || 'Cliente General',
      cuit: budgetData.cuit?.trim() || '',
      telefono: budgetData.telefono?.trim() || '',
      direccion: budgetData.direccion?.trim() || '',
      localidad: budgetData.localidad?.trim() || '',
      subtotal: sub,
      descuento: desc,
      recargo: rec,
      total: tot,
      observaciones: budgetData.observaciones?.trim() || '',
      productos: budgetData.productos || [],
    };

    // Si viene un ID explícito se utiliza, de lo contrario se deja a Supabase (IDENTITY)
    if (budgetData.id) {
      payload.id = Number(budgetData.id);
    }

    const { data, error } = await supabase
      .from('presupuestos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[budgetWebService] Error al crear presupuesto:', error.message);
      throw new Error(`Error en Supabase al crear presupuesto: ${error.message}`);
    }
    return data;
  },

  async updateBudget(id: number, budgetData: Partial<BudgetFormData>): Promise<Budget> {
    if (budgetData.total !== undefined && budgetData.total <= 0) {
      throw new Error('El total del presupuesto debe ser mayor a cero.');
    }

    const payload: Partial<Budget> = {
      fecha: budgetData.fecha,
      cliente: budgetData.cliente?.trim(),
      cuit: budgetData.cuit?.trim(),
      telefono: budgetData.telefono?.trim(),
      direccion: budgetData.direccion?.trim(),
      localidad: budgetData.localidad?.trim(),
      subtotal: budgetData.subtotal !== undefined ? Number(budgetData.subtotal) : undefined,
      descuento: budgetData.descuento !== undefined ? Number(budgetData.descuento) : undefined,
      recargo: budgetData.recargo !== undefined ? Number(budgetData.recargo) : undefined,
      total: budgetData.total !== undefined ? Number(budgetData.total) : undefined,
      observaciones: budgetData.observaciones?.trim(),
      productos: budgetData.productos,
    };

    const { data, error } = await supabase
      .from('presupuestos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[budgetWebService] Error al actualizar presupuesto ID ${id}:`, error.message);
      throw new Error(`Error al actualizar presupuesto: ${error.message}`);
    }
    return data;
  },

  async deleteBudget(id: number): Promise<void> {
    const { error } = await supabase
      .from('presupuestos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[budgetWebService] Error al eliminar presupuesto ID ${id}:`, error.message);
      throw new Error(`Error al eliminar presupuesto: ${error.message}`);
    }
  },
};
