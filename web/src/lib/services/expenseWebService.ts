import { supabase } from '../supabase/client';
import { Expense, ExpenseFormData, ExpenseStats, CategoryExpenseSummary } from '@/types/expense';

export const expenseWebService = {
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[expenseWebService] Error al obtener gastos:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async createExpense(expenseData: ExpenseFormData): Promise<Expense> {
    if (!expenseData.concepto || !expenseData.concepto.trim()) {
      throw new Error('El concepto o descripción del gasto es obligatorio.');
    }
    if (expenseData.monto <= 0) {
      throw new Error('El monto del gasto debe ser mayor a cero.');
    }

    const payload: Partial<Expense> = {
      fecha: expenseData.fecha || new Date().toISOString().split('T')[0],
      concepto: expenseData.concepto.trim(),
      categoria: expenseData.categoria?.trim() || 'General',
      monto: Number(expenseData.monto || 0),
      observacion: expenseData.observacion?.trim() || '',
      estado: expenseData.estado || 'Pagado',
    };

    if (expenseData.id) {
      payload.id = Number(expenseData.id);
    }

    const { data, error } = await supabase
      .from('gastos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[expenseWebService] Error al crear gasto:', error.message);
      throw new Error(`Error en Supabase al crear gasto: ${error.message}`);
    }
    return data;
  },

  async updateExpense(id: number, expenseData: Partial<ExpenseFormData>): Promise<Expense> {
    if (expenseData.concepto !== undefined && !expenseData.concepto.trim()) {
      throw new Error('El concepto del gasto no puede estar vacío.');
    }
    if (expenseData.monto !== undefined && expenseData.monto <= 0) {
      throw new Error('El monto debe ser un número positivo mayor a cero.');
    }

    const payload: Partial<Expense> = {
      fecha: expenseData.fecha,
      concepto: expenseData.concepto?.trim(),
      categoria: expenseData.categoria?.trim(),
      monto: expenseData.monto !== undefined ? Number(expenseData.monto) : undefined,
      observacion: expenseData.observacion?.trim(),
      estado: expenseData.estado,
    };

    const { data, error } = await supabase
      .from('gastos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[expenseWebService] Error al actualizar gasto ID ${id}:`, error.message);
      throw new Error(`Error al actualizar gasto: ${error.message}`);
    }
    return data;
  },

  async deleteExpense(id: number): Promise<void> {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[expenseWebService] Error al eliminar gasto ID ${id}:`, error.message);
      throw new Error(`Error al eliminar gasto: ${error.message}`);
    }
  },

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('gastos')
      .select('categoria');

    if (error) {
      console.error('[expenseWebService] Error al obtener categorías de gastos:', error.message);
      return ['General', 'Servicios', 'Impuestos', 'Alquiler', 'Mantenimiento', 'Insumos', 'Sueldos'];
    }

    const set = new Set<string>(['General', 'Servicios', 'Impuestos', 'Alquiler', 'Mantenimiento', 'Insumos', 'Sueldos']);
    data?.forEach(g => {
      if (g.categoria) set.add(g.categoria);
    });
    return Array.from(set).sort();
  },

  async getExpenseStats(): Promise<ExpenseStats> {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    const { data, error } = await supabase
      .from('gastos')
      .select('*');

    if (error) {
      console.error('[expenseWebService] Error al obtener estadísticas de gastos:', error.message);
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    const expenses = data || [];
    const totalHistorico = expenses.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
    const gastoMesActual = expenses
      .filter((e) => e.fecha && e.fecha.startsWith(currentMonth))
      .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
    const gastoPendiente = expenses
      .filter((e) => (e.estado || 'Pagado') === 'Pendiente')
      .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

    const categoryMap: { [cat: string]: { total: number; cantidad: number } } = {};

    expenses.forEach((e) => {
      const cat = e.categoria?.trim() || 'General';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, cantidad: 0 };
      }
      categoryMap[cat].total += Number(e.monto || 0);
      categoryMap[cat].cantidad += 1;
    });

    const porCategoria: CategoryExpenseSummary[] = Object.keys(categoryMap).map((cat) => {
      const total = categoryMap[cat].total;
      const cantidad = categoryMap[cat].cantidad;
      const porcentaje = totalHistorico > 0 ? (total / totalHistorico) * 100 : 0;
      return {
        categoria: cat,
        total,
        cantidad,
        porcentaje: Number(porcentaje.toFixed(1)),
      };
    }).sort((a, b) => b.total - a.total);

    return {
      totalHistorico,
      gastoMesActual,
      gastoPendiente,
      totalRegistros: expenses.length,
      porCategoria,
    };
  },
};

