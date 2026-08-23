'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GroupedSaleRecord, PresupuestoHistoryRecord, RemitoHistoryRecord, HistoryDocumentType } from '@/types/history';

interface HistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: HistoryDocumentType;
  record: GroupedSaleRecord | PresupuestoHistoryRecord | RemitoHistoryRecord | null;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  isOpen,
  onClose,
  documentType,
  record,
}) => {
  // 1. Declarar todos los hooks incondicionalmente al inicio del componente
  const [cliente, setCliente] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cuit, setCuit] = useState('');
  const [vendedor, setVendedor] = useState('Administrador');
  const [observaciones, setObservaciones] = useState('');
  const [transporte, setTransporte] = useState('');

  const isSale = documentType === 'ventas';
  const isPresupuesto = documentType === 'presupuestos';
  const isRemito = documentType === 'remitos';

  const saleRecord = isSale ? (record as GroupedSaleRecord) : null;
  const presupuestoRecord = isPresupuesto ? (record as PresupuestoHistoryRecord) : null;
  const remitoRecord = isRemito ? (record as RemitoHistoryRecord) : null;

  useEffect(() => {
    if (record) {
      setCliente(record.cliente || 'Consumidor Final');
      setDireccion(presupuestoRecord?.direccion || remitoRecord?.direccion || '');
      setLocalidad(presupuestoRecord?.localidad || remitoRecord?.localidad || '');
      setTelefono(presupuestoRecord?.telefono || remitoRecord?.telefono || '');
      setCuit(presupuestoRecord?.cuit || remitoRecord?.cuit || '');
      setVendedor(remitoRecord?.vendedor || 'Administrador');
      setObservaciones(presupuestoRecord?.observaciones || remitoRecord?.observaciones || '');
      setTransporte(remitoRecord?.transporte || '');
    }
  }, [record, presupuestoRecord, remitoRecord]);

  // 2. Retorno temprano posterior a la declaración de hooks
  if (!record) return null;

  const items = saleRecord
    ? saleRecord.items
    : presupuestoRecord?.productos || remitoRecord?.productos || [];

  const subtotal = record.subtotal || record.total || 0;
  const descuento = record.descuento || 0;
  const totalFinal = record.total || 0;

  const fechaObj = new Date(record.fecha || Date.now());
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const anio = String(fechaObj.getFullYear());
  const hora = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const nroFormateado = isPresupuesto
    ? (presupuestoRecord?.numeroFormatted || `P-${String(record.id).padStart(4, '0')}`)
    : isRemito
    ? (remitoRecord?.numeroFormatted || `R-${String(record.id).padStart(4, '0')}`)
    : `Ticket #${record.id}`;

  // Impresión idéntica a Electron
  const handlePrint = () => {
    const printWin = window.open('', '_blank', isSale ? 'width=350,height=700' : 'width=900,height=900');
    if (!printWin) return;

    let htmlContent = '';

    if (isSale) {
      // 1. TICKET DE VENTA — IMPRESIÓN PANTALLA TÉRMICA 100% ELECTRON
      htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Ticket #${record.id}</title>
          <style>
            @media print {
              body {
                font-family: 'Courier New', monospace;
                width: 180px;
                margin: 0;
                padding: 5px;
                font-size: 9px;
                font-weight: bold;
                background: white;
                line-height: 1.1;
              }
              .no-print { display: none !important; }
            }
            @media screen {
              body {
                font-family: 'Courier New', monospace;
                width: 180px;
                margin: 0 auto;
                padding: 10px;
                font-size: 10px;
                font-weight: bold;
                background: white;
                line-height: 1.2;
              }
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              padding-bottom: 5px;
              border-bottom: 1px dashed #000;
            }
            .logo-container {
              text-align: center;
              margin-bottom: 5px;
            }
            .logo {
              max-width: 60px;
              max-height: 60px;
              width: auto;
              height: auto;
            }
            h2 {
              text-align: center;
              margin: 3px 0;
              font-size: 14px;
              font-weight: bold;
              color: #000;
            }
            .direccion {
              text-align: center;
              font-size: 8px;
              font-weight: bold;
              color: #000;
              margin-bottom: 3px;
              line-height: 1.2;
            }
            .fecha {
              text-align: center;
              font-size: 8px;
              font-weight: bold;
              color: #000;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 4px;
            }
            .tipo-ticket {
              text-align: center;
              font-weight: bold;
              color: #000;
              margin: 3px 0;
              font-size: 9px;
            }
            .productos {
              margin: 8px 0;
            }
            .producto-item {
              margin-bottom: 4px;
              line-height: 1.1;
            }
            .producto-nombre {
              font-weight: bold;
              font-size: 9px;
              margin-bottom: 1px;
            }
            .producto-detalle {
              font-size: 8px;
              font-weight: bold;
            }
            .resumen {
              margin-top: 8px;
              border-top: 1px dashed #000;
              padding-top: 4px;
            }
            .resumen-fila {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              font-size: 8px;
            }
            .resumen-total {
              border-top: 1px solid #000;
              padding-top: 3px;
              margin-top: 4px;
              font-weight: bold;
              font-size: 10px;
            }
            .metodo-pago {
              text-align: center;
              margin-top: 5px;
              font-size: 8px;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 8px;
              font-weight: bold;
              border-top: 1px dashed #000;
              padding-top: 4px;
              color: #000;
            }
            .gracias {
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            @page {
              margin: 5mm;
              size: 58mm auto;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="/img/logoperla2.png" class="logo" alt="Logo La Perla Desarrolladora S.A." onerror="this.style.display='none';">
            </div>
            <h2>La Perla Desarrolladora S.A.</h2>
            <div class="direccion">
              FERRETERÍA - ELECTRICIDAD - PINTURA<br>
              SIMÓN PÉREZ 5972 - G. Catán<br>
              Tel: 11-7083-2748
            </div>
          </div>
          <div class="fecha">
            Fecha: ${dia}/${mes}/${anio}, ${hora}<br>
            Ticket N°: ${record.id}
          </div>
          <div class="tipo-ticket">TICKET DE VENTA</div>
          <div class="productos">
            ${items.map(p => `
              <div class="producto-item">
                <div class="producto-nombre">${p.nombre}</div>
                <div class="producto-detalle">Cantidad: ${p.cantidad} x $${Number(p.precio).toFixed(2)} = $${(Number(p.precio) * p.cantidad).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          <div class="resumen">
            <div class="resumen-fila">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${descuento > 0 ? `
            <div class="resumen-fila">
              <span>Descuento:</span>
              <span>-$${descuento.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="resumen-fila resumen-total">
              <span>TOTAL:</span>
              <span>$${totalFinal.toFixed(2)}</span>
            </div>
          </div>
          <div class="metodo-pago">Método de pago: ${saleRecord?.metodo_pago || 'Efectivo'}</div>
          <div class="footer">
            <div class="gracias">¡GRACIAS POR SU COMPRA!</div>
          </div>
        </body>
        </html>
      `;
    } else if (isPresupuesto) {
      // 2. PRESUPUESTO TALONARIO A4 (Idéntico a Electron)
      const minRows = 15;
      let rowsHtml = items.map(p => `
        <tr>
          <td style="text-align: center; border-right: 1.5px solid #000; font-weight: bold; padding: 6px;">${p.cantidad}</td>
          <td style="border-right: 1.5px solid #000; padding: 6px;">${p.nombre}</td>
          <td style="text-align: right; border-right: 1.5px solid #000; font-family: monospace; padding: 6px;">$${Number(p.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; padding: 6px;">$${(Number(p.precio) * p.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      for (let i = items.length; i < minRows; i++) {
        rowsHtml += `
          <tr style="height: 24px;">
            <td style="border-right: 1.5px solid #000; border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
            <td style="border-right: 1.5px solid #000; border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
            <td style="border-right: 1.5px solid #000; border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
            <td style="border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
          </tr>
        `;
      }

      htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Presupuesto ${nroFormateado}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 10px; }
            .header-box { display: grid; grid-template-columns: 1fr 60px 1.2fr; border: 2px solid #000; border-radius: 14px; padding: 12px 15px; margin-bottom: 15px; align-items: center; position: relative; }
            .letter-x-box { border: 2px solid #000; width: 34px; height: 34px; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 22px; background-color: #000; color: #fff; position: absolute; top: -2px; left: 45%; transform: translateX(-50%); }
            .date-box { border: 1.5px solid #000; border-radius: 6px; padding: 4px 8px; min-width: 24px; text-align: center; font-weight: bold; background: #fff; display: inline-block; }
            .client-box { border: 2px solid #000; border-radius: 14px; padding: 12px 18px; margin-bottom: 15px; font-size: 11.5px; line-height: 2.2; }
            .client-dots { border-bottom: 1.5px dotted #000; padding: 0 4px; font-weight: bold; display: inline-block; }
            .table-container { border: 2px solid #000; border-radius: 14px; overflow: hidden; margin-bottom: 15px; position: relative; background: #fff; }
            .product-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
            .product-table th { background-color: #f1f5f9; border-bottom: 2px solid #000; font-weight: 800; text-align: center; padding: 8px 6px; text-transform: uppercase; }
            .totals-box { border: 2px solid #000; border-radius: 14px; padding: 10px 18px; max-width: 320px; margin-left: auto; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="display: flex; align-items: center; gap: 15px;">
              <img src="/img/logoperla2.png" style="width: 75px; height: 75px; object-fit: contain;" alt="Logo">
              <div style="font-size: 11.5px; line-height: 1.4;">
                <div style="font-weight: 800; font-size: 16px;">La Perla Desarrolladora S.A.</div>
                <div style="font-weight: bold; font-size: 11px;">FERRETERÍA - ELECTRICIDAD - PINTURA</div>
                <div>SIMÓN PÉREZ 5972 - G. Catán</div>
                <div style="font-weight: bold; margin-top: 4px;">📲 11-7083-2748</div>
              </div>
            </div>
            <div class="letter-x-box">X</div>
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding-left: 20px;">
              <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">PRESUPUESTO</div>
              <div style="font-size: 14px; font-weight: 800; margin-bottom: 8px;">N° 0001 - ${String(record.id).padStart(8, '0')}</div>
              <div style="font-size: 11px; font-weight: bold;">
                Fecha: <span class="date-box">${dia}</span> <span class="date-box">${mes}</span> <span class="date-box">${anio}</span>
              </div>
              <div style="font-size: 8px; font-weight: 800; margin-top: 4px;">DOCUMENTO NO VÁLIDO COMO FACTURA</div>
            </div>
          </div>

          <div class="client-box">
            <div>Señor(es): <span class="client-dots" style="width: 80%;">${cliente}</span></div>
            <div style="display: flex; justify-content: space-between;">
              <span style="flex: 1;">Domicilio: <span class="client-dots" style="width: 70%;">${direccion}</span></span>
              <span style="flex: 1;">Localidad: <span class="client-dots" style="width: 70%;">${localidad}</span></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="flex: 1;">Teléfono: <span class="client-dots" style="width: 70%;">${telefono}</span></span>
              <span style="flex: 1;">C.U.I.T.: <span class="client-dots" style="width: 70%;">${cuit}</span></span>
            </div>
          </div>

          <div class="table-container">
            <table class="product-table">
              <thead>
                <tr>
                  <th style="width: 12%; border-right: 1.5px solid #000;">CANT.</th>
                  <th style="width: 50%; border-right: 1.5px solid #000;">DETALLE</th>
                  <th style="width: 18%; border-right: 1.5px solid #000;">P. UNIT.</th>
                  <th style="width: 20%;">IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="totals-box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Subtotal:</span>
              <span>$${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            ${descuento > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626;">
              <span>Descuento:</span>
              <span>-$${descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; border-top: 2px solid #000; padding-top: 6px; margin-top: 4px;">
              <span>TOTAL:</span>
              <span>$${totalFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (isRemito) {
      // 3. REMITO FORMAL TALONARIO A4 (Idéntico a Electron)
      const minRows = 13;
      let rowsHtml = items.map(p => `
        <tr>
          <td style="text-align: center; border-right: 1.5px solid #000; font-weight: bold; padding: 6px;">${p.cantidad}</td>
          <td style="font-family: monospace; border-right: 1.5px solid #000; padding: 6px;">${p.codigo || '—'}</td>
          <td style="border-right: 1.5px solid #000; padding: 6px;">${p.nombre}</td>
          <td style="padding: 6px; font-size: 10px;">${p.observaciones || ''}</td>
        </tr>
      `).join('');

      for (let i = items.length; i < minRows; i++) {
        rowsHtml += `
          <tr style="height: 24px;">
            <td style="border-right: 1.5px solid #000; border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
            <td style="border-right: 1.5px solid #000; border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
            <td style="border-right: 1.5px solid #000; border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
            <td style="border-bottom: 1px dashed #e2e8f0;">&nbsp;</td>
          </tr>
        `;
      }

      htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Remito ${nroFormateado}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 10px; }
            .header-box { display: grid; grid-template-columns: 1.2fr 140px 1fr; border: 2px solid #000; border-radius: 14px; margin-bottom: 15px; }
            .letter-r-circle { border: 2px solid #000; width: 44px; height: 44px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 26px; margin-bottom: 6px; }
            .date-box { border: 1.5px solid #000; border-radius: 6px; padding: 3px 6px; min-width: 20px; text-align: center; font-weight: bold; background: #fff; display: inline-block; }
            .client-box { border: 2px solid #000; border-radius: 14px; padding: 12px 18px; margin-bottom: 15px; font-size: 11.5px; line-height: 2.2; }
            .client-dots { border-bottom: 1.5px dotted #000; padding: 0 4px; font-weight: bold; display: inline-block; }
            .table-container { border: 2px solid #000; border-radius: 14px; overflow: hidden; margin-bottom: 15px; }
            .product-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
            .product-table th { background-color: #f1f5f9; border-bottom: 2px solid #000; font-weight: 800; text-align: center; padding: 8px 6px; text-transform: uppercase; }
            .footer-box { border: 2px solid #000; border-radius: 14px; padding: 12px 18px; font-size: 11px; line-height: 1.8; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px;">
              <img src="/img/logoperla2.png" style="width: 75px; height: 75px; object-fit: contain;" alt="Logo">
              <div style="font-size: 11.5px; line-height: 1.4;">
                <div style="font-weight: 800; font-size: 16px;">La Perla Desarrolladora S.A.</div>
                <div style="font-weight: bold; font-size: 11px;">FERRETERÍA - ELECTRICIDAD - PINTURA</div>
                <div>SIMÓN PÉREZ 5972 - G. Catán</div>
                <div style="font-weight: bold; margin-top: 4px;">📲 11-7083-2748</div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 2px solid #000; border-right: 2px solid #000; padding: 15px 5px; text-align: center;">
              <div class="letter-r-circle">R</div>
              <div style="font-size: 14px; font-weight: 900; text-transform: uppercase;">REMITO</div>
              <div style="font-size: 8px; font-weight: bold;">DOCUMENTO NO VÁLIDO COMO FACTURA</div>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; padding: 15px 20px; gap: 6px;">
              <div style="font-size: 14px; font-weight: 800;">N° 0001 - ${String(record.id).padStart(8, '0')}</div>
              <div style="font-size: 11px; font-weight: bold;">
                Fecha: <span class="date-box">${dia}</span> <span class="date-box">${mes}</span> <span class="date-box">${anio}</span>
              </div>
            </div>
          </div>

          <div class="client-box">
            <div>Señor(es): <span class="client-dots" style="width: 80%;">${cliente}</span></div>
            <div style="display: flex; justify-content: space-between;">
              <span style="flex: 1;">Domicilio: <span class="client-dots" style="width: 70%;">${direccion}</span></span>
              <span style="flex: 1;">Localidad: <span class="client-dots" style="width: 70%;">${localidad}</span></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="flex: 1;">Teléfono: <span class="client-dots" style="width: 70%;">${telefono}</span></span>
              <span style="flex: 1;">C.U.I.T.: <span class="client-dots" style="width: 70%;">${cuit}</span></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="flex: 1;">Vendedor: <span class="client-dots" style="width: 70%;">${vendedor}</span></span>
              <span style="flex: 1;">Observaciones: <span class="client-dots" style="width: 70%;">${observaciones}</span></span>
            </div>
          </div>

          <div class="table-container">
            <table class="product-table">
              <thead>
                <tr>
                  <th style="width: 12%; border-right: 1.5px solid #000;">Cant.</th>
                  <th style="width: 18%; border-right: 1.5px solid #000;">Código</th>
                  <th style="width: 50%; border-right: 1.5px solid #000;">DETALLE</th>
                  <th style="width: 20%;">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer-box">
            <div style="display: flex; justify-content: space-between;">
              <span style="flex: 1;">TRANSPORTE: <span class="client-dots" style="width: 70%;">${transporte}</span></span>
              <span style="flex: 1;">C.U.I.T.: <span class="client-dots" style="width: 70%;">${cuit}</span></span>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div>RECIBI CONFORME: ___________________________</div>
              <div>Firma y Sello: ___________________________</div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    printWin.document.write(htmlContent);
    printWin.document.close();
    setTimeout(() => printWin.print(), 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSale ? `Ticket #${record.id}` : isPresupuesto ? `Presupuesto ${nroFormateado}` : `Remito ${nroFormateado}`}
      description="Vista previa oficial idéntica a Electron"
      maxWidthClass={isSale ? 'max-w-[280px]' : 'max-w-4xl'}
    >
      <div className="space-y-4">
        {/* Barra superior interactiva si es documento A4 */}
        {!isSale && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              💡 Podés rellenar los datos del cliente en pantalla antes de imprimir.
            </span>
            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 px-3">
              🖨️ Imprimir {isPresupuesto ? 'Presupuesto' : 'Remito'}
            </Button>
          </div>
        )}

        {/* 1. VISTA TICKET DE VENTA — ESTRUCTURA Y CSS IDÉNTICO A ELECTRON (L6920-7108) */}
        {isSale && (
          <div className="bg-white text-black p-2.5 rounded-lg shadow-md mx-auto w-[180px] font-['Courier_New',monospace] font-bold text-[10px] leading-[1.2] border border-slate-300 space-y-2">
            {/* Header del Ticket */}
            <div className="text-center pb-1 mb-2 border-b border-dashed border-black">
              <div className="text-center mb-1">
                <img
                  src="/img/logoperla2.png"
                  alt="Logo La Perla"
                  className="max-w-[60px] max-h-[60px] w-auto h-auto mx-auto object-contain"
                />
              </div>
              <h2 className="text-center text-[14px] font-bold my-1 text-black leading-tight">
                La Perla Desarrolladora S.A.
              </h2>
              <div className="text-center text-[8px] font-bold text-black mb-1 leading-[1.2]">
                FERRETERÍA - ELECTRICIDAD - PINTURA<br />
                SIMÓN PÉREZ 5972 - G. Catán<br />
                Tel: 11-7083-2748
              </div>
            </div>

            {/* Fecha y N° de Ticket */}
            <div className="text-center text-[8px] font-bold text-black mb-2 border-b border-dashed border-black pb-1">
              Fecha: {dia}/{mes}/{anio}, {hora}<br />
              Ticket N°: {record.id}
            </div>

            {/* Tipo de Ticket */}
            <div className="text-center font-bold text-black my-1 text-[9px]">
              TICKET DE VENTA
            </div>

            {/* Lista de Productos */}
            <div className="my-2 space-y-1">
              {items.map((p, idx) => (
                <div key={idx} className="mb-1 leading-[1.1]">
                  <div className="font-bold text-[9px] mb-0.5">{p.nombre}</div>
                  <div className="text-[8px] font-bold">
                    Cantidad: {p.cantidad} x ${Number(p.precio).toFixed(2)} = ${(Number(p.precio) * p.cantidad).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen de Totales */}
            <div className="mt-2 border-t border-dashed border-black pt-1">
              <div className="flex justify-between mb-0.5 text-[8px]">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between mb-0.5 text-[8px]">
                  <span>Descuento:</span>
                  <span>-${descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-black pt-1 mt-1 font-bold text-[10px]">
                <span>TOTAL:</span>
                <span>${totalFinal.toFixed(2)}</span>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="text-center mt-1.5 text-[8px] font-bold">
              Método de pago: {saleRecord?.metodo_pago || 'Efectivo'}
            </div>

            {/* Footer */}
            <div className="text-center mt-2.5 text-[8px] font-bold border-t border-dashed border-black pt-1 text-black">
              <div className="text-[9px] font-bold mb-0.5">¡GRACIAS POR SU COMPRA!</div>
            </div>

            {/* Botón Imprimir Ticket */}
            <div className="pt-2 text-center">
              <Button onClick={handlePrint} className="w-full bg-slate-900 text-white hover:bg-black text-[10px] font-bold py-1.5 rounded">
                Imprimir Ticket
              </Button>
            </div>
          </div>
        )}

        {/* 2. VISTA PRESUPUESTO TALONARIO (User Image 2) */}
        {isPresupuesto && (
          <div className="bg-white text-black p-5 rounded-2xl border-2 border-black space-y-4 max-w-[780px] mx-auto text-xs font-sans">
            {/* Header box 3 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-2 border-black rounded-xl p-3 gap-3 items-center relative">
              <div className="flex items-center gap-3">
                <img src="/img/logoperla2.png" className="w-16 h-16 object-contain shrink-0" alt="Logo" />
                <div className="text-[11px] leading-snug">
                  <div className="font-extrabold text-sm">La Perla Desarrolladora S.A.</div>
                  <div className="font-bold text-[10px]">FERRETERÍA - ELECTRICIDAD - PINTURA</div>
                  <div className="text-[10px]">SIMÓN PÉREZ 5972 - G. Catán</div>
                  <div className="font-bold text-[11px] mt-0.5">📲 11-7083-2748</div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 bg-black text-white font-black text-xl flex items-center justify-center border-2 border-black mb-1">X</div>
                <div className="font-extrabold text-sm tracking-wider">PRESUPUESTO</div>
                <div className="text-[8px] font-bold">DOCUMENTO NO VÁLIDO COMO FACTURA</div>
              </div>

              <div className="flex flex-col items-center text-center space-y-1">
                <div className="font-extrabold text-sm">N° 0001 - {String(record.id).padStart(8, '0')}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <span>Fecha:</span>
                  <span className="border-1.5 border-black rounded px-1.5 py-0.5 bg-white font-bold">{dia}</span>
                  <span className="border-1.5 border-black rounded px-1.5 py-0.5 bg-white font-bold">{mes}</span>
                  <span className="border-1.5 border-black rounded px-1.5 py-0.5 bg-white font-bold">{anio}</span>
                </div>
              </div>
            </div>

            {/* Client box */}
            <div className="border-2 border-black rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold shrink-0">Señor(es):</span>
                <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 font-bold outline-none bg-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Domicilio:</span>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Localidad:</span>
                  <input type="text" value={localidad} onChange={(e) => setLocalidad(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Teléfono:</span>
                  <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">C.U.I.T.:</span>
                  <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
              </div>
            </div>

            {/* Tabla de Productos con marca de agua */}
            <div className="border-2 border-black rounded-xl overflow-hidden relative bg-white">
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <img src="/img/logoperla2.png" className="w-64 h-64 object-contain" alt="Watermark" />
              </div>
              <table className="w-full text-xs text-left relative z-10 border-collapse">
                <thead className="bg-slate-100 border-b-2 border-black font-extrabold uppercase text-[11px]">
                  <tr>
                    <th className="p-2 text-center w-[12%] border-r-1.5 border-black">CANT.</th>
                    <th className="p-2 w-[50%] border-r-1.5 border-black">DETALLE</th>
                    <th className="p-2 text-right w-[18%] border-r-1.5 border-black">P. UNIT.</th>
                    <th className="p-2 text-right w-[20%]">IMPORTE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-300 font-medium">
                  {items.map((p, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center font-bold border-r-1.5 border-black">{p.cantidad}</td>
                      <td className="p-2 border-r-1.5 border-black">{p.nombre}</td>
                      <td className="p-2 text-right font-mono border-r-1.5 border-black">${Number(p.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right font-mono font-bold">${(Number(p.precio) * p.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="border-2 border-black rounded-xl p-3 ml-auto max-w-[280px] space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Descuento:</span>
                  <span>-${descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1">
                <span>TOTAL:</span>
                <span>${totalFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. VISTA REMITO TALONARIO */}
        {isRemito && (
          <div className="bg-white text-black p-5 rounded-2xl border-2 border-black space-y-4 max-w-[780px] mx-auto text-xs font-sans">
            {/* Header box 3 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-2 border-black rounded-xl p-3 gap-3 items-center">
              <div className="flex items-center gap-3">
                <img src="/img/logoperla2.png" className="w-16 h-16 object-contain shrink-0" alt="Logo" />
                <div className="text-[11px] leading-snug">
                  <div className="font-extrabold text-sm">La Perla Desarrolladora S.A.</div>
                  <div className="font-bold text-[10px]">FERRETERÍA - ELECTRICIDAD - PINTURA</div>
                  <div className="text-[10px]">SIMÓN PÉREZ 5972 - G. Catán</div>
                  <div className="font-bold text-[11px] mt-0.5">📲 11-7083-2748</div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center font-black text-2xl mb-1">R</div>
                <div className="font-extrabold text-sm tracking-wider">REMITO</div>
                <div className="text-[8px] font-bold">DOCUMENTO NO VÁLIDO COMO FACTURA</div>
              </div>

              <div className="flex flex-col items-center text-center space-y-1">
                <div className="font-extrabold text-sm">N° 0001 - {String(record.id).padStart(8, '0')}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <span>Fecha:</span>
                  <span className="border-1.5 border-black rounded px-1.5 py-0.5 bg-white font-bold">{dia}</span>
                  <span className="border-1.5 border-black rounded px-1.5 py-0.5 bg-white font-bold">{mes}</span>
                  <span className="border-1.5 border-black rounded px-1.5 py-0.5 bg-white font-bold">{anio}</span>
                </div>
              </div>
            </div>

            {/* Client box */}
            <div className="border-2 border-black rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold shrink-0">Señor(es):</span>
                <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 font-bold outline-none bg-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Domicilio:</span>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Localidad:</span>
                  <input type="text" value={localidad} onChange={(e) => setLocalidad(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Teléfono:</span>
                  <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">C.U.I.T.:</span>
                  <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Vendedor:</span>
                  <input type="text" value={vendedor} onChange={(e) => setVendedor(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">Observaciones:</span>
                  <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
              </div>
            </div>

            {/* Tabla de Productos con marca de agua */}
            <div className="border-2 border-black rounded-xl overflow-hidden relative bg-white">
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <img src="/img/logoperla2.png" className="w-64 h-64 object-contain" alt="Watermark" />
              </div>
              <table className="w-full text-xs text-left relative z-10 border-collapse">
                <thead className="bg-slate-100 border-b-2 border-black font-extrabold uppercase text-[11px]">
                  <tr>
                    <th className="p-2 text-center w-[12%] border-r-1.5 border-black">Cant.</th>
                    <th className="p-2 w-[18%] border-r-1.5 border-black">Código</th>
                    <th className="p-2 w-[50%] border-r-1.5 border-black">DETALLE</th>
                    <th className="p-2 w-[20%]">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-300 font-medium">
                  {items.map((p, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center font-bold border-r-1.5 border-black">{p.cantidad}</td>
                      <td className="p-2 font-mono border-r-1.5 border-black">{p.codigo || '—'}</td>
                      <td className="p-2 border-r-1.5 border-black">{p.nombre}</td>
                      <td className="p-2 text-[10px]">{p.observaciones || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer transporte y firma */}
            <div className="border-2 border-black rounded-xl p-3 text-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">TRANSPORTE:</span>
                  <input type="text" value={transporte} onChange={(e) => setTransporte(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">C.U.I.T.:</span>
                  <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} className="w-full border-b-1.5 border-dotted border-black px-1 outline-none bg-transparent" />
                </div>
              </div>
              <div className="pt-2 flex justify-between items-end text-[11px] font-bold">
                <div>RECIBI CONFORME: ___________________________</div>
                <div>Firma y Sello: ___________________________</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 px-4 text-xs">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
