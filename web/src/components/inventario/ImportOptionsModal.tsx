'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileSpreadsheet, Check } from 'lucide-react';

export interface ImportOptions {
  stock: boolean;
  precioVenta: boolean;
  precioCosto: boolean;
}

interface ImportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowCount: number;
  onConfirm: (options: ImportOptions) => void;
  isLoading?: boolean;
}

export const ImportOptionsModal: React.FC<ImportOptionsModalProps> = ({
  isOpen,
  onClose,
  rowCount,
  onConfirm,
  isLoading = false,
}) => {
  const [options, setOptions] = useState<ImportOptions>({
    stock: true,
    precioVenta: false,
    precioCosto: true,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title={
        <div className="flex items-center space-x-2 text-emerald-500 dark:text-emerald-400">
          <FileSpreadsheet className="w-5 h-5" />
          <span className="font-bold text-slate-900 dark:text-slate-100">
            Opciones de Importación
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          Se detectaron <span className="font-bold">{rowCount}</span> filas válidas en el archivo Excel. Selecciona qué campos deseas actualizar en productos existentes:
        </div>

        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <label className="flex items-center space-x-3 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={options.stock}
              onChange={(e) => setOptions({ ...options, stock: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700"
            />
            <span>Actualizar Stock (suma el stock importado al existente)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={options.precioVenta}
              onChange={(e) => setOptions({ ...options, precioVenta: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700"
            />
            <span>Actualizar Precio de Venta (reemplaza precio)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={options.precioCosto}
              onChange={(e) => setOptions({ ...options, precioCosto: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700"
            />
            <span>Actualizar Precio de Costo (reemplaza costo)</span>
          </label>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(options)}
            isLoading={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Check className="w-4 h-4 mr-1.5" /> Importar Productos
          </Button>
        </div>
      </div>
    </Modal>
  );
};
