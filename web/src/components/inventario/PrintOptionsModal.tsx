'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, X } from 'lucide-react';

export type PrintOptionType = 'ticket' | 'presupuesto' | 'remito';

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: PrintOptionType) => void;
}

export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  const options: Array<{
    id: PrintOptionType;
    icon: string;
    title: string;
    description: string;
  }> = [
    {
      id: 'ticket',
      icon: '🧾',
      title: 'Imprimir Ticket',
      description: 'Comprobante de venta rápido',
    },
    {
      id: 'presupuesto',
      icon: '📄',
      title: 'Imprimir Presupuesto',
      description: 'Documento no válido como factura',
    },
    {
      id: 'remito',
      icon: '🚚',
      title: 'Imprimir Remito',
      description: 'Documento no válido como factura',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title={
        <div className="flex items-center space-x-2 text-blue-500 dark:text-blue-400">
          <Printer className="w-5 h-5" />
          <span className="font-bold text-slate-900 dark:text-slate-100">Opciones de Impresión</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelectOption(option.id);
                onClose();
              }}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all flex items-center space-x-3.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200/70 dark:bg-slate-700/60 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40 flex items-center justify-center text-xl shrink-0 transition-colors">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {option.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1.5" /> Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
