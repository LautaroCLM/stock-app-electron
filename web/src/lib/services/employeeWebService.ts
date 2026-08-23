import { supabase } from '../supabase/client';
import { Employee, EmployeeFormData } from '@/types/employee';

export const employeeWebService = {
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[employeeWebService] Error al obtener empleados:', error.message);
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return data || [];
  },

  async checkDuplicateDni(dni: string, excludeId?: number): Promise<boolean> {
    if (!dni || !dni.trim()) return false;

    let query = supabase
      .from('empleados')
      .select('id')
      .eq('dni', dni.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[employeeWebService] Error al verificar DNI duplicado:', error.message);
      return false;
    }
    return (data && data.length > 0) || false;
  },

  async createEmployee(employeeData: EmployeeFormData): Promise<Employee> {
    if (!employeeData.nombre || !employeeData.nombre.trim()) {
      throw new Error('El nombre del empleado es obligatorio.');
    }
    if (!employeeData.apellido || !employeeData.apellido.trim()) {
      throw new Error('El apellido del empleado es obligatorio.');
    }
    if (!employeeData.dni || !employeeData.dni.trim()) {
      throw new Error('El DNI del empleado es obligatorio.');
    }

    const isDuplicate = await this.checkDuplicateDni(employeeData.dni.trim());
    if (isDuplicate) {
      throw new Error(`Ya existe otro empleado registrado con el DNI "${employeeData.dni.trim()}".`);
    }

    const payload: Partial<Employee> = {
      nombre: employeeData.nombre.trim(),
      apellido: employeeData.apellido.trim(),
      dni: employeeData.dni.trim(),
      telefono: employeeData.telefono?.trim() || '',
      email: employeeData.email?.trim() || '',
      direccion: employeeData.direccion?.trim() || '',
      fecha_nacimiento: employeeData.fecha_nacimiento || undefined,
      cargo: employeeData.cargo?.trim() || 'Empleado',
      fecha_ingreso: employeeData.fecha_ingreso || undefined,
      salario: employeeData.salario !== undefined ? Number(employeeData.salario) : undefined,
      estado: employeeData.estado || 'Activo',
      observaciones: employeeData.observaciones?.trim() || '',
    };

    if (employeeData.id) {
      payload.id = Number(employeeData.id);
    }

    const { data, error } = await supabase
      .from('empleados')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[employeeWebService] Error al crear empleado:', error.message);
      throw new Error(`Error en Supabase al crear empleado: ${error.message}`);
    }
    return data;
  },

  async updateEmployee(id: number, employeeData: Partial<EmployeeFormData>): Promise<Employee> {
    if (employeeData.nombre !== undefined && !employeeData.nombre.trim()) {
      throw new Error('El nombre del empleado no puede estar vacío.');
    }
    if (employeeData.apellido !== undefined && !employeeData.apellido.trim()) {
      throw new Error('El apellido del empleado no puede estar vacío.');
    }
    if (employeeData.dni !== undefined && !employeeData.dni.trim()) {
      throw new Error('El DNI no puede estar vacío.');
    }

    if (employeeData.dni && employeeData.dni.trim()) {
      const isDuplicate = await this.checkDuplicateDni(employeeData.dni.trim(), id);
      if (isDuplicate) {
        throw new Error(`El DNI "${employeeData.dni.trim()}" ya pertenece a otro empleado.`);
      }
    }

    const payload: Partial<Employee> = {
      nombre: employeeData.nombre?.trim(),
      apellido: employeeData.apellido?.trim(),
      dni: employeeData.dni?.trim(),
      telefono: employeeData.telefono?.trim(),
      email: employeeData.email?.trim(),
      direccion: employeeData.direccion?.trim(),
      fecha_nacimiento: employeeData.fecha_nacimiento,
      cargo: employeeData.cargo?.trim(),
      fecha_ingreso: employeeData.fecha_ingreso,
      salario: employeeData.salario !== undefined ? Number(employeeData.salario) : undefined,
      estado: employeeData.estado,
      observaciones: employeeData.observaciones?.trim(),
    };

    const { data, error } = await supabase
      .from('empleados')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[employeeWebService] Error al actualizar empleado ID ${id}:`, error.message);
      throw new Error(`Error al actualizar empleado: ${error.message}`);
    }
    return data;
  },

  async deleteEmployee(id: number): Promise<void> {
    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[employeeWebService] Error al eliminar empleado ID ${id}:`, error.message);
      throw new Error(`Error al eliminar empleado: ${error.message}`);
    }
  },
};
