import { supabase } from '../supabase/client';
import {
  Machine,
  MachineFormData,
  MachineWorkLog,
  MachineWorkLogFormData,
  MachineFuelLog,
  MachineFuelLogFormData,
  MachineMaintenanceLog,
  MachineMaintenanceLogFormData,
  MachineProfitability,
  MachineStats,
} from '@/types/machine';

export const machineWebService = {
  // ── MÁQUINAS ─────────────────────────────────────────────────────────────

  async getMachines(): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('maquinas')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[machineWebService] Error al obtener máquinas:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async createMachine(machineData: MachineFormData): Promise<Machine> {
    if (!machineData.nombre || !machineData.nombre.trim()) {
      throw new Error('El nombre de la máquina o vehículo es obligatorio.');
    }

    const payload: Partial<Machine> = {
      nombre: machineData.nombre.trim(),
      tipo: machineData.tipo?.trim() || 'General',
      marca: machineData.marca?.trim() || '',
      modelo: machineData.modelo?.trim() || '',
      anio: machineData.anio ? Number(machineData.anio) : undefined,
      numero_serie: machineData.numero_serie?.trim() || '',
      valor_hora: Number(machineData.valor_hora || 0),
      horas_totales: Number(machineData.horas_totales || 0),
      estado: machineData.estado || 'Disponible',
      observaciones: machineData.observaciones?.trim() || '',
    };

    if (machineData.id) {
      payload.id = Number(machineData.id);
    }

    const { data, error } = await supabase
      .from('maquinas')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[machineWebService] Error al crear máquina:', error.message);
      throw new Error(`Error en Supabase al crear máquina: ${error.message}`);
    }
    return data;
  },

  async updateMachine(id: number, machineData: Partial<MachineFormData>): Promise<Machine> {
    if (machineData.nombre !== undefined && !machineData.nombre.trim()) {
      throw new Error('El nombre de la máquina no puede estar vacío.');
    }

    const payload: Partial<Machine> = {
      nombre: machineData.nombre?.trim(),
      tipo: machineData.tipo?.trim(),
      marca: machineData.marca?.trim(),
      modelo: machineData.modelo?.trim(),
      anio: machineData.anio ? Number(machineData.anio) : undefined,
      numero_serie: machineData.numero_serie?.trim(),
      valor_hora: machineData.valor_hora !== undefined ? Number(machineData.valor_hora) : undefined,
      horas_totales: machineData.horas_totales !== undefined ? Number(machineData.horas_totales) : undefined,
      estado: machineData.estado,
      observaciones: machineData.observaciones?.trim(),
    };

    const { data, error } = await supabase
      .from('maquinas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[machineWebService] Error al actualizar máquina ID ${id}:`, error.message);
      throw new Error(`Error al actualizar máquina: ${error.message}`);
    }
    return data;
  },

  async deleteMachine(id: number): Promise<void> {
    // Borrar registros dependientes
    await supabase.from('trabajos_maquinas').delete().eq('maquina_id', id);
    await supabase.from('combustible_maquinas').delete().eq('maquina_id', id);
    await supabase.from('mantenimiento_maquinas').delete().eq('maquina_id', id);

    const { error } = await supabase
      .from('maquinas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[machineWebService] Error al eliminar máquina ID ${id}:`, error.message);
      throw new Error(`Error al eliminar máquina: ${error.message}`);
    }
  },

  // ── TRABAJOS Y HORAS DE USO ──────────────────────────────────────────────

  async getWorkLogs(maquinaId?: number): Promise<MachineWorkLog[]> {
    let query = supabase
      .from('trabajos_maquinas')
      .select('*, maquinas(nombre)')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (maquinaId) {
      query = query.eq('maquina_id', maquinaId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[machineWebService] Error al obtener trabajos:', error.message);
      throw new Error(`Error al consultar partes de trabajo: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      ...row,
      maquina_nombre: row.maquinas?.nombre || '',
    }));
  },

  async createWorkLog(workData: MachineWorkLogFormData): Promise<MachineWorkLog> {
    if (!workData.maquina_id) throw new Error('ID de máquina requerido.');
    if (!workData.horas || workData.horas <= 0) throw new Error('Las horas trabajadas deben ser mayores a 0.');

    const horasNum = Number(workData.horas);
    const precioNum = Number(workData.precio_hora || 0);
    const totalNum = workData.total !== undefined ? Number(workData.total) : (horasNum * precioNum);

    const payload = {
      maquina_id: Number(workData.maquina_id),
      fecha: workData.fecha || new Date().toISOString().split('T')[0],
      cliente: workData.cliente?.trim() || '',
      operador: workData.operador?.trim() || '',
      horas: horasNum,
      precio_hora: precioNum,
      total: totalNum,
      observaciones: workData.observaciones?.trim() || '',
    };

    const { data: log, error } = await supabase
      .from('trabajos_maquinas')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[machineWebService] Error al registrar trabajo:', error.message);
      throw new Error(`Error al registrar parte de trabajo: ${error.message}`);
    }

    // Actualizar horas totales acumuladas en la máquina
    const { data: maq } = await supabase
      .from('maquinas')
      .select('horas_totales')
      .eq('id', workData.maquina_id)
      .single();

    if (maq) {
      const nuevasHoras = Number(maq.horas_totales || 0) + horasNum;
      await supabase
        .from('maquinas')
        .update({ horas_totales: nuevasHoras })
        .eq('id', workData.maquina_id);
    }

    return log;
  },

  async deleteWorkLog(id: number): Promise<void> {
    const { data: log } = await supabase
      .from('trabajos_maquinas')
      .select('maquina_id, horas')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('trabajos_maquinas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[machineWebService] Error al eliminar trabajo ID ${id}:`, error.message);
      throw new Error(`Error al eliminar trabajo: ${error.message}`);
    }

    if (log && log.maquina_id) {
      const { data: maq } = await supabase
        .from('maquinas')
        .select('horas_totales')
        .eq('id', log.maquina_id)
        .single();

      if (maq) {
        const nuevasHoras = Math.max(0, Number(maq.horas_totales || 0) - Number(log.horas || 0));
        await supabase
          .from('maquinas')
          .update({ horas_totales: nuevasHoras })
          .eq('id', log.maquina_id);
      }
    }
  },

  // ── COMBUSTIBLE MAQUINAS ──────────────────────────────────────────────────

  async getFuelLogs(maquinaId?: number): Promise<MachineFuelLog[]> {
    let query = supabase
      .from('combustible_maquinas')
      .select('*, maquinas(nombre)')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (maquinaId) {
      query = query.eq('maquina_id', maquinaId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[machineWebService] Error al obtener combustible:', error.message);
      throw new Error(`Error al consultar cargas de combustible: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      ...row,
      maquina_nombre: row.maquinas?.nombre || '',
    }));
  },

  async createFuelLog(fuelData: MachineFuelLogFormData): Promise<MachineFuelLog> {
    if (!fuelData.maquina_id) throw new Error('ID de máquina requerido.');
    if (!fuelData.litros || fuelData.litros <= 0) throw new Error('Los litros de combustible deben ser mayores a 0.');

    const litrosNum = Number(fuelData.litros);
    const precioNum = Number(fuelData.precio_litro || 0);
    const totalNum = fuelData.total !== undefined ? Number(fuelData.total) : (litrosNum * precioNum);

    const payload = {
      maquina_id: Number(fuelData.maquina_id),
      fecha: fuelData.fecha || new Date().toISOString().split('T')[0],
      litros: litrosNum,
      precio_litro: precioNum,
      total: totalNum,
      observaciones: fuelData.observaciones?.trim() || '',
    };

    const { data: log, error } = await supabase
      .from('combustible_maquinas')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[machineWebService] Error al registrar carga de combustible:', error.message);
      throw new Error(`Error al registrar combustible: ${error.message}`);
    }

    return log;
  },

  async deleteFuelLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('combustible_maquinas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[machineWebService] Error al eliminar registro de combustible ID ${id}:`, error.message);
      throw new Error(`Error al eliminar combustible: ${error.message}`);
    }
  },

  // ── MANTENIMIENTO MAQUINAS ────────────────────────────────────────────────

  async getMaintenanceLogs(maquinaId?: number): Promise<MachineMaintenanceLog[]> {
    let query = supabase
      .from('mantenimiento_maquinas')
      .select('*, maquinas(nombre)')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (maquinaId) {
      query = query.eq('maquina_id', maquinaId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[machineWebService] Error al obtener mantenimientos:', error.message);
      throw new Error(`Error al consultar mantenimientos: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      ...row,
      maquina_nombre: row.maquinas?.nombre || '',
    }));
  },

  async createMaintenanceLog(maintData: MachineMaintenanceLogFormData): Promise<MachineMaintenanceLog> {
    if (!maintData.maquina_id) throw new Error('ID de máquina requerido.');
    if (!maintData.descripcion?.trim()) throw new Error('La descripción del mantenimiento es obligatoria.');

    const payload = {
      maquina_id: Number(maintData.maquina_id),
      fecha: maintData.fecha || new Date().toISOString().split('T')[0],
      tipo: maintData.tipo || 'Preventivo',
      descripcion: maintData.descripcion.trim(),
      costo: Number(maintData.costo || 0),
      taller: maintData.taller?.trim() || '',
      estado: maintData.estado || 'Realizado',
    };

    const { data: log, error } = await supabase
      .from('mantenimiento_maquinas')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[machineWebService] Error al registrar mantenimiento:', error.message);
      throw new Error(`Error al registrar mantenimiento: ${error.message}`);
    }

    // Actualizar ultimo_servicio en la máquina
    await supabase
      .from('maquinas')
      .update({ ultimo_servicio: maintData.fecha })
      .eq('id', maintData.maquina_id);

    return log;
  },

  async deleteMaintenanceLog(id: number): Promise<void> {
    const { error } = await supabase
      .from('mantenimiento_maquinas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[machineWebService] Error al eliminar mantenimiento ID ${id}:`, error.message);
      throw new Error(`Error al eliminar mantenimiento: ${error.message}`);
    }
  },

  // ── RENTABILIDAD Y ESTADÍSTICAS ──────────────────────────────────────────

  async getProfitability(): Promise<MachineProfitability[]> {
    const [maqRes, trabRes, combRes, mantRes] = await Promise.all([
      supabase.from('maquinas').select('id, nombre, tipo, horas_totales').order('nombre', { ascending: true }),
      supabase.from('trabajos_maquinas').select('maquina_id, total'),
      supabase.from('combustible_maquinas').select('maquina_id, total'),
      supabase.from('mantenimiento_maquinas').select('maquina_id, costo').eq('estado', 'Realizado'),
    ]);

    if (maqRes.error) throw new Error(maqRes.error.message);

    const maquinas = maqRes.data || [];
    const trabajos = trabRes.data || [];
    const combustibles = combRes.data || [];
    const mantenimientos = mantRes.data || [];

    return maquinas.map((m) => {
      const ingresos = trabajos.filter(t => t.maquina_id === m.id).reduce((acc, t) => acc + Number(t.total || 0), 0);
      const gasto_combustible = combustibles.filter(c => c.maquina_id === m.id).reduce((acc, c) => acc + Number(c.total || 0), 0);
      const gasto_mantenimiento = mantenimientos.filter(mt => mt.maquina_id === m.id).reduce((acc, mt) => acc + Number(mt.costo || 0), 0);
      const rentabilidad_neta = ingresos - (gasto_combustible + gasto_mantenimiento);

      return {
        id: m.id,
        nombre: m.nombre,
        tipo: m.tipo,
        horas_totales: Number(m.horas_totales || 0),
        ingresos,
        gasto_combustible,
        gasto_mantenimiento,
        rentabilidad_neta,
      };
    });
  },

  async getStats(): Promise<MachineStats> {
    const primerDiaMes = new Date().toISOString().slice(0, 7) + '-01';

    const [maqRes, trabRes, combRes, mantRes] = await Promise.all([
      supabase.from('maquinas').select('estado'),
      supabase.from('trabajos_maquinas').select('horas, total').gte('fecha', primerDiaMes),
      supabase.from('combustible_maquinas').select('total').gte('fecha', primerDiaMes),
      supabase.from('mantenimiento_maquinas').select('costo').gte('fecha', primerDiaMes).eq('estado', 'Realizado'),
    ]);

    const maquinas = maqRes.data || [];
    const trabajos = trabRes.data || [];
    const combustibles = combRes.data || [];
    const mantenimientos = mantRes.data || [];

    const totalMaquinas = maquinas.length;
    const disponibles = maquinas.filter(m => (m.estado || 'Disponible') === 'Disponible').length;
    const enUso = maquinas.filter(m => m.estado === 'En uso').length;
    const enMantenimiento = maquinas.filter(m => m.estado === 'En Mantenimiento').length;

    const horasMes = trabajos.reduce((acc, t) => acc + Number(t.horas || 0), 0);
    const ingresosMes = trabajos.reduce((acc, t) => acc + Number(t.total || 0), 0);
    const gastoComb = combustibles.reduce((acc, c) => acc + Number(c.total || 0), 0);
    const gastoMant = mantenimientos.reduce((acc, mt) => acc + Number(mt.costo || 0), 0);

    return {
      totalMaquinas,
      disponibles,
      enUso,
      enMantenimiento,
      horasMes,
      ingresosMes,
      gastoComb,
      gastoMant,
    };
  },
};

