export interface MenuItem {
  name: string;
  href: string;
  iconName: string;
  category?: 'core' | 'operations';
}

export const NAVIGATION_ITEMS: MenuItem[] = [
  // MÓDULOS PRINCIPALES
  { name: 'Finanzas', href: '/', iconName: 'PieChart', category: 'core' },
  { name: 'Inventario', href: '/inventario', iconName: 'Package', category: 'core' },
  { name: 'Informes', href: '/informes', iconName: 'TrendingUp', category: 'core' },
  { name: 'Historial', href: '/historial', iconName: 'History', category: 'core' },

  // OPERACIONES
  { name: 'Empleados', href: '/empleados', iconName: 'UserCheck', category: 'operations' },
  { name: 'Proveedores', href: '/proveedores', iconName: 'Truck', category: 'operations' },
  { name: 'Municipio', href: '/municipio', iconName: 'Building2', category: 'operations' },
  { name: 'Clientes', href: '/clientes', iconName: 'UserCheck', category: 'operations' },
  { name: 'Atmosférico', href: '/atmosferico', iconName: 'Droplet', category: 'operations' },
  { name: 'Máquinas', href: '/maquinas', iconName: 'Cog', category: 'operations' },
  { name: 'Liquidación Empleados', href: '/empleados-liquidacion', iconName: 'Receipt', category: 'operations' },
  { name: 'Gastos', href: '/gastos', iconName: 'Wallet', category: 'operations' },
  { name: 'Ajustes Caja', href: '/ajustes-caja', iconName: 'Calculator', category: 'operations' },
];
