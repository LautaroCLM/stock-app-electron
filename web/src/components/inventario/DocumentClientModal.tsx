'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { User, MapPin, Phone, FileText, Building2, Check, Loader2 } from 'lucide-react';
import { PrintOptionType } from '@/components/inventario/PrintOptionsModal';
import { clientWebService } from '@/lib/services/clientWebService';
import { Client } from '@/types/client';

interface DocumentClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: PrintOptionType;
  onConfirm: (clientData: {
    cliente: string;
    cuit: string;
    direccion: string;
    localidad: string;
    telefono: string;
    observaciones: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const DocumentClientModal: React.FC<DocumentClientModalProps> = ({
  isOpen,
  onClose,
  documentType,
  onConfirm,
  isLoading = false,
}) => {
  const [cliente, setCliente] = useState('Consumidor Final');
  const [cuit, setCuit] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [clientList, setClientList] = useState<Client[]>([]);

  useEffect(() => {
    if (isOpen) {
      clientWebService
        .getClients()
        .then((data) => setClientList(data || []))
        .catch((err) => {
          // Si no hay permisos SQL para la tabla clientes, capturar silenciosamente
          console.warn('[DocumentClientModal] Consulta a clientes omitida por falta de permisos RLS:', err?.message || err);
          setClientList([]);
        });
    }
  }, [isOpen]);

  const handleSelectClient = (c: Client) => {
    setCliente(c.nombre || '');
    setCuit(c.cuit || '');
    setDireccion(c.direccion || '');
    setLocalidad((c as any).localidad || '');
    setTelefono(c.telefono || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      cliente: cliente.trim() || 'Consumidor Final',
      cuit: cuit.trim(),
      direccion: direccion.trim(),
      localidad: localidad.trim(),
      telefono: telefono.trim(),
      observaciones: observaciones.trim(),
    });
  };

  const titleText = documentType === 'presupuesto' ? 'Emitir Presupuesto / Cotización' : 'Emitir Remito de Entrega';
  const descText = documentType === 'presupuesto'
    ? 'Completa los datos del destinatario para generar e imprimir el presupuesto en Supabase.'
    : 'Completa los datos de entrega para generar e imprimir el remito de entrega en Supabase.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleText} description={descText} maxWidthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-200">
        {/* Selector de Cliente Existente (Si hay acceso a clientes en Supabase) */}
        {clientList.length > 0 && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Seleccionar Cliente Registrado (Opcional):</label>
            <select
              onChange={(e) => {
                const found = clientList.find((c) => String(c.id) === e.target.value);
                if (found) handleSelectClient(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Autocompletar con cliente existente --</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.cuit ? `(${c.cuit})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Nombre Cliente */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-400" /> Nombre / Razón Social:
            </label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente o Consumidor Final"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* CUIT */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-purple-400" /> CUIT / DNI:
            </label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="Ej: 20-12345678-9"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" /> Teléfono / WhatsApp:
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 3482123456"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Dirección */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Dirección:
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y altura"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Localidad */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Localidad:
            </label>
            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Localidad"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Observaciones Adicionales:
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas para el comprobante..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Acciones */}
        <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isLoading} className="px-4">
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" /> Emitir e Imprimir
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
