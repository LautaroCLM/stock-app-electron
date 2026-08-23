'use client';

import React from 'react';
import { Supplier } from '@/types/supplier';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit2, Trash2, Truck, Phone, Mail, MapPin, User, FileText } from 'lucide-react';

interface SupplierTableProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: number) => void;
  onViewAccount?: (supplier: Supplier) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  isLoading,
  onEdit,
  onDelete,
  onViewAccount,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cargando padrón de proveedores desde Supabase...</p>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Truck className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron proveedores</p>
        <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o registra un nuevo proveedor.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>CUIT</TableHead>
          <TableHead>Razón Social / Empresa</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Teléfono / Email</TableHead>
          <TableHead>Ubicación</TableHead>
          <TableHead className="text-right">Deuda Actual</TableHead>
          <TableHead className="text-center">Última Compra</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => {
          const isActive = (supplier.estado || 'Activo') === 'Activo';
          const deuda = supplier.deuda_actual || 0;
          const hasDebt = deuda > 0;

          return (
            <TableRow key={supplier.id}>
              <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {supplier.cuit || `- #${supplier.id}`}
              </TableCell>
              <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                {supplier.razon_social}
              </TableCell>
              <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                {supplier.contacto ? (
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{supplier.contacto}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                <div className="space-y-0.5">
                  {supplier.telefono ? (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{supplier.telefono}</span>
                    </div>
                  ) : null}
                  {supplier.email ? (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{supplier.email}</span>
                    </div>
                  ) : null}
                  {!supplier.telefono && !supplier.email && <span className="text-slate-400">-</span>}
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                {supplier.ciudad || supplier.direccion ? (
                  <div className="flex items-center space-x-1.5 max-w-xs truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">
                      {[supplier.ciudad, supplier.provincia].filter(Boolean).join(', ') || supplier.direccion}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className={`text-right font-mono text-xs font-semibold ${hasDebt ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatCurrency(deuda)}
              </TableCell>
              <TableCell className="text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                {supplier.ultima_compra ? supplier.ultima_compra : '-'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={isActive ? 'success' : 'danger'}>
                  {supplier.estado || 'Activo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  {onViewAccount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewAccount(supplier)}
                      className="p-1.5 hover:text-emerald-600 dark:hover:text-emerald-400"
                      title="Cuenta Corriente"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(supplier)}
                    className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Editar proveedor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(supplier.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400"
                    title="Eliminar proveedor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

