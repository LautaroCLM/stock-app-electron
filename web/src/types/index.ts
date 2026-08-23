export type ThemeMode = 'light' | 'dark';

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string | number;
}

export type UserRole = 'administrador' | 'empleado' | 'caja' | 'solo_lectura' | 'Admin';

export type PermissionModule =
  | 'inventario'
  | 'ventas'
  | 'clientes'
  | 'proveedores'
  | 'informes'
  | 'gastos'
  | 'empleados'
  | 'maquinas'
  | 'municipio'
  | 'atmosferico'
  | 'configuracion'
  | 'caja';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'print';

export interface Company {
  id: string;
  nombre: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_id?: string | null;
  company?: Company | null;
  avatarUrl?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const ROLE_PERMISSIONS: Record<UserRole, Partial<Record<PermissionModule, PermissionAction[]>>> = {
  administrador: {
    inventario: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    ventas: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    clientes: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    proveedores: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    informes: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    gastos: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    empleados: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    maquinas: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    municipio: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    atmosferico: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    configuracion: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    caja: ['view', 'create', 'edit', 'delete', 'export', 'print'],
  },
  Admin: {
    inventario: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    ventas: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    clientes: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    proveedores: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    informes: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    gastos: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    empleados: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    maquinas: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    municipio: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    atmosferico: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    configuracion: ['view', 'create', 'edit', 'delete', 'export', 'print'],
    caja: ['view', 'create', 'edit', 'delete', 'export', 'print'],
  },
  empleado: {
    inventario: ['view', 'create', 'edit'],
    ventas: ['view', 'create', 'print'],
    clientes: ['view', 'create', 'edit'],
    proveedores: ['view'],
    informes: ['view'],
    gastos: ['view'],
    empleados: ['view'],
    maquinas: ['view', 'edit'],
    municipio: ['view'],
    atmosferico: ['view'],
    configuracion: [],
    caja: ['view', 'create'],
  },
  caja: {
    inventario: ['view'],
    ventas: ['view', 'create', 'print'],
    clientes: ['view', 'create'],
    proveedores: [],
    informes: ['view'],
    gastos: ['view', 'create'],
    empleados: [],
    maquinas: [],
    municipio: [],
    atmosferico: [],
    configuracion: [],
    caja: ['view', 'create', 'edit'],
  },
  solo_lectura: {
    inventario: ['view'],
    ventas: ['view'],
    clientes: ['view'],
    proveedores: ['view'],
    informes: ['view'],
    gastos: ['view'],
    empleados: ['view'],
    maquinas: ['view'],
    municipio: ['view'],
    atmosferico: ['view'],
    configuracion: ['view'],
    caja: ['view'],
  },
};

export function hasPermission(
  role: UserRole | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!role) return false;
  const roleRules = ROLE_PERMISSIONS[role];
  if (!roleRules) return false;
  const moduleActions = roleRules[module];
  if (!moduleActions) return false;
  return moduleActions.includes(action);
}
