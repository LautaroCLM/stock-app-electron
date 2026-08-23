'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface HistorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'tickets' | 'presupuestos' | 'remitos') => void;
}

export const HistorySelectorModal: React.FC<HistorySelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Historial"
      description="Elige el tipo de registro o documento que deseas visualizar"
    >
      <div className="space-y-3">
        {/* Option 1: Tickets */}
        <button
          onClick={() => {
            onSelectOption('tickets');
            onClose();
          }}
          className="w-full p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 flex items-center space-x-4 text-left transition-all group"
        >
          <span className="text-2xl p-2.5 rounded-xl bg-blue-950/80 border border-blue-800/60 group-hover:scale-105 transition-transform">
            🎫
          </span>
          <div>
            <strong className="text-sm font-bold text-slate-100 block">
              Ver Tickets
            </strong>
            <span className="text-xs text-slate-400 block mt-0.5">
              Historial de tickets emitidos
            </span>
          </div>
        </button>

        {/* Option 2: Presupuestos */}
        <button
          onClick={() => {
            onSelectOption('presupuestos');
            onClose();
          }}
          className="w-full p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 flex items-center space-x-4 text-left transition-all group"
        >
          <span className="text-2xl p-2.5 rounded-xl bg-purple-950/80 border border-purple-800/60 group-hover:scale-105 transition-transform">
            📄
          </span>
          <div>
            <strong className="text-sm font-bold text-slate-100 block">
              Ver Presupuestos
            </strong>
            <span className="text-xs text-slate-400 block mt-0.5">
              Historial de presupuestos emitidos
            </span>
          </div>
        </button>

        {/* Option 3: Remitos */}
        <button
          onClick={() => {
            onSelectOption('remitos');
            onClose();
          }}
          className="w-full p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 flex items-center space-x-4 text-left transition-all group"
        >
          <span className="text-2xl p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/60 group-hover:scale-105 transition-transform">
            🚚
          </span>
          <div>
            <strong className="text-sm font-bold text-slate-100 block">
              Ver Remitos
            </strong>
            <span className="text-xs text-slate-400 block mt-0.5">
              Historial de remitos emitidos
            </span>
          </div>
        </button>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
