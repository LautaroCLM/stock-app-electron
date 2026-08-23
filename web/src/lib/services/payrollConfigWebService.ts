import { supabase } from '../supabase/client';
import { PayrollConfig } from '@/types/payroll';

export const payrollConfigWebService = {
  async getConfigs(): Promise<PayrollConfig[]> {
    const { data, error } = await supabase
      .from('empleado_liquidacion_config')
      .select('*');

    if (error) {
      console.error('[payrollConfigWebService] Error al obtener configuraciones de liquidación:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async getConfigByEmployee(empleadoId: number): Promise<PayrollConfig | null> {
    const { data, error } = await supabase
      .from('empleado_liquidacion_config')
      .select('*')
      .eq('empleado_id', empleadoId)
      .maybeSingle();

    if (error) {
      console.error(`[payrollConfigWebService] Error al obtener configuración de empleado ID ${empleadoId}:`, error.message);
      throw new Error(`Error en Supabase: ${error.message}`);
    }
    return data;
  },

  async saveConfig(config: PayrollConfig): Promise<PayrollConfig> {
    if (!config.empleado_id) {
      throw new Error('ID de empleado requerido.');
    }

    const payload = {
      empleado_id: Number(config.empleado_id),
      valor_hora: Number(config.valor_hora || 0),
      costo_mensual: Number(config.costo_mensual || 0),
      estado: config.estado || 'Activo',
    };

    const { data, error } = await supabase
      .from('empleado_liquidacion_config')
      .upsert(payload, { onConflict: 'empleado_id' })
      .select()
      .single();

    if (error) {
      console.error('[payrollConfigWebService] Error al guardar configuración:', error.message);
      throw new Error(`Error en Supabase: ${error.message}`);
    }
    return data;
  }
};

