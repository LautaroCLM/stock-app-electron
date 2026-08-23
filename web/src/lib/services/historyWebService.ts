import { supabase } from '../supabase/client';
import {
  GroupedSaleRecord,
  PresupuestoHistoryRecord,
  RemitoHistoryRecord,
  HistoryFilterParams,
  PaginatedHistoryResult,
  HistoryItemDetail,
} from '@/types/history';

function getArgStartOfDayISO(dateStr?: string): string {
  if (dateStr && dateStr.trim()) {
    return `${dateStr.trim()}T00:00:00.000-03:00`;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000-03:00`;
}

function getArgEndOfDayISO(dateStr?: string): string {
  if (dateStr && dateStr.trim()) {
    return `${dateStr.trim()}T23:59:59.999-03:00`;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59.999-03:00`;
}

function calculateDateRange(period: string, customDate?: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthStr = `${currentYear}-${currentMonth}`;

  if (customDate && customDate.trim() !== '') {
    return {
      startISO: getArgStartOfDayISO(customDate),
      endISO: getArgEndOfDayISO(customDate),
      label: `Fecha: ${customDate.trim()}`,
    };
  }

  switch (period) {
    case 'hoy': {
      return {
        startISO: getArgStartOfDayISO(),
        endISO: getArgEndOfDayISO(),
        label: 'Hoy',
      };
    }
    case 'semana': {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      const y = sevenDaysAgo.getFullYear();
      const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
      const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
      return {
        startISO: `${y}-${m}-${d}T00:00:00.000-03:00`,
        endISO: getArgEndOfDayISO(),
        label: 'Última semana',
      };
    }
    case 'mes': {
      const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      return {
        startISO: `${currentMonthStr}-01T00:00:00.000-03:00`,
        endISO: `${currentMonthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999-03:00`,
        label: 'Mes actual',
      };
    }
    case 'año': {
      return {
        startISO: `${currentYear}-01-01T00:00:00.000-03:00`,
        endISO: `${currentYear}-12-31T23:59:59.999-03:00`,
        label: 'Año en curso',
      };
    }
    default: {
      const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      return {
        startISO: `${currentMonthStr}-01T00:00:00.000-03:00`,
        endISO: `${currentMonthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999-03:00`,
        label: 'Mes actual',
      };
    }
  }
}

export const historyWebService = {
  /**
   * Obtener Historial de Ventas Reales Agrupadas por Operación
   */
  async getSalesHistory(params: HistoryFilterParams): Promise<PaginatedHistoryResult<GroupedSaleRecord>> {
    const { period, customDate, searchQuery, paymentMethod, page = 1, pageSize = 10 } = params;
    const { startISO, endISO } = calculateDateRange(period, customDate);

    let query = supabase
      .from('ventas')
      .select('id, producto_id, cantidad, total, metodo_pago, cliente, fecha, productos(id, nombre, precio, unidad)')
      .gte('fecha', startISO)
      .lte('fecha', endISO)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (paymentMethod && paymentMethod !== 'todos') {
      query = query.eq('metodo_pago', paymentMethod);
    }

    const { data: rawVentas, error } = await query;

    if (error) {
      console.error('[historyWebService] Error al obtener ventas:', error.message);
      throw new Error(`Error en Supabase al consultar ventas: ${error.message}`);
    }

    const rows = rawVentas || [];

    // Agrupar filas pertenecientes a una misma operación de venta
    // Criterio: Ventas realizadas dentro de un margen de 3 segundos con mismo cliente y mismo método de pago
    const groups: GroupedSaleRecord[] = [];
    const groupMap = new Map<string, GroupedSaleRecord>();

    rows.forEach((row: any) => {
      const rowDate = new Date(row.fecha);
      const timeKey = Math.floor(rowDate.getTime() / 3000); // Ventanas de 3 segundos
      const key = `${timeKey}_${row.cliente || 'Consumidor Final'}_${row.metodo_pago || 'Efectivo'}`;

      const prodName = row.productos?.nombre || (row.producto_id ? `Producto #${row.producto_id}` : 'Venta Directa');
      const unitPrice = row.productos?.precio || (Number(row.cantidad) > 0 ? Number(row.total) / Number(row.cantidad) : Number(row.total));

      const itemDetail: HistoryItemDetail = {
        id: row.id,
        producto_id: row.producto_id,
        nombre: prodName,
        cantidad: Number(row.cantidad || 1),
        precio: Number(unitPrice || 0),
        total: Number(row.total || 0),
        unidad: row.productos?.unidad || 'un',
      };

      if (groupMap.has(key)) {
        const group = groupMap.get(key)!;
        group.items.push(itemDetail);
        group.total += Number(row.total || 0);
        group.itemsCount += 1;
      } else {
        const newGroup: GroupedSaleRecord = {
          id: `V-${row.id}`,
          fecha: row.fecha,
          cliente: row.cliente || 'Consumidor Final',
          metodo_pago: row.metodo_pago || 'Efectivo',
          total: Number(row.total || 0),
          items: [itemDetail],
          itemsCount: 1,
          resumenProductos: '',
        };
        groupMap.set(key, newGroup);
        groups.push(newGroup);
      }
    });

    // Formatear resumen de productos por grupo
    groups.forEach((g) => {
      g.resumenProductos = g.items
        .map((it) => `${it.nombre} (x${it.cantidad})`)
        .join(', ');
    });

    // Aplicar filtro de búsqueda general si existe
    let filteredGroups = groups;
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filteredGroups = groups.filter(
        (g) =>
          String(g.id).toLowerCase().includes(q) ||
          g.cliente.toLowerCase().includes(q) ||
          g.metodo_pago.toLowerCase().includes(q) ||
          g.resumenProductos.toLowerCase().includes(q)
      );
    }

    // Paginación
    const totalCount = filteredGroups.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const paginatedData = filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      data: paginatedData,
      totalCount,
      page: currentPage,
      totalPages,
    };
  },

  /**
   * Obtener Historial de Presupuestos Reales desde Supabase
   */
  async getPresupuestosHistory(params: HistoryFilterParams): Promise<PaginatedHistoryResult<PresupuestoHistoryRecord>> {
    const { period, customDate, searchQuery, page = 1, pageSize = 10 } = params;
    const { startISO, endISO } = calculateDateRange(period, customDate);

    const { data: rawPresupuestos, error } = await supabase
      .from('presupuestos')
      .select('*')
      .gte('fecha', startISO)
      .lte('fecha', endISO)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[historyWebService] Error al obtener presupuestos:', error.message);
      throw new Error(`Error en Supabase al consultar presupuestos: ${error.message}`);
    }

    const records: PresupuestoHistoryRecord[] = (rawPresupuestos || []).map((p: any) => {
      let parsedProds: HistoryItemDetail[] = [];
      if (Array.isArray(p.productos)) {
        parsedProds = p.productos.map((prod: any) => ({
          nombre: prod.nombre || prod.producto_nombre || 'Producto sin nombre',
          cantidad: Number(prod.cantidad || 1),
          precio: Number(prod.precio || 0),
          total: Number(prod.subtotal || (prod.precio * prod.cantidad) || 0),
          unidad: prod.unidad || 'un',
        }));
      }

      const resumen = parsedProds.length > 0
        ? parsedProds.map((it) => `${it.nombre} (x${it.cantidad})`).join(', ')
        : 'Sin productos registrados';

      return {
        id: p.id,
        numeroFormatted: `P-${String(p.id).padStart(4, '0')}`,
        fecha: p.fecha || new Date().toISOString(),
        cliente: p.cliente || 'Consumidor Final',
        cuit: p.cuit || '',
        telefono: p.telefono || '',
        direccion: p.direccion || '',
        localidad: p.localidad || '',
        subtotal: Number(p.subtotal || p.total || 0),
        descuento: Number(p.descuento || 0),
        recargo: Number(p.recargo || 0),
        total: Number(p.total || 0),
        observaciones: p.observaciones || '',
        estado: p.estado || 'Pendiente',
        productos: parsedProds,
        resumenProductos: resumen,
      };
    });

    let filtered = records;
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = records.filter(
        (p) =>
          String(p.id).toLowerCase().includes(q) ||
          p.numeroFormatted.toLowerCase().includes(q) ||
          p.cliente.toLowerCase().includes(q) ||
          p.resumenProductos.toLowerCase().includes(q)
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      data: paginatedData,
      totalCount,
      page: currentPage,
      totalPages,
    };
  },

  /**
   * Obtener Historial de Remitos Reales desde Supabase
   */
  async getRemitosHistory(params: HistoryFilterParams): Promise<PaginatedHistoryResult<RemitoHistoryRecord>> {
    const { period, customDate, searchQuery, page = 1, pageSize = 10 } = params;
    const { startISO, endISO } = calculateDateRange(period, customDate);

    const { data: rawRemitos, error } = await supabase
      .from('remitos')
      .select('*')
      .gte('fecha', startISO)
      .lte('fecha', endISO)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('[historyWebService] Error al obtener remitos:', error.message);
      throw new Error(`Error en Supabase al consultar remitos: ${error.message}`);
    }

    const records: RemitoHistoryRecord[] = (rawRemitos || []).map((r: any) => {
      let parsedProds: HistoryItemDetail[] = [];
      if (Array.isArray(r.productos)) {
        parsedProds = r.productos.map((prod: any) => ({
          nombre: prod.nombre || prod.producto_nombre || 'Producto sin nombre',
          cantidad: Number(prod.cantidad || 1),
          precio: Number(prod.precio || 0),
          total: Number(prod.subtotal || (prod.precio * prod.cantidad) || 0),
          unidad: prod.unidad || 'un',
        }));
      }

      const resumen = parsedProds.length > 0
        ? parsedProds.map((it) => `${it.nombre} (x${it.cantidad})`).join(', ')
        : 'Sin productos registrados';

      return {
        id: r.id,
        numeroFormatted: `R-${String(r.id).padStart(4, '0')}`,
        fecha: r.fecha || new Date().toISOString(),
        cliente: r.cliente || 'Consumidor Final',
        cuit: r.cuit || '',
        telefono: r.telefono || '',
        direccion: r.direccion || '',
        localidad: r.localidad || '',
        metodo_pago: r.metodo_pago || 'Efectivo',
        subtotal: Number(r.subtotal || r.total || 0),
        descuento: Number(r.descuento || 0),
        recargo: Number(r.recargo || 0),
        total: Number(r.total || 0),
        observaciones: r.observaciones || '',
        productos: parsedProds,
        resumenProductos: resumen,
      };
    });

    let filtered = records;
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = records.filter(
        (r) =>
          String(r.id).toLowerCase().includes(q) ||
          r.numeroFormatted.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.resumenProductos.toLowerCase().includes(q)
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return {
      data: paginatedData,
      totalCount,
      page: currentPage,
      totalPages,
    };
  },
};
