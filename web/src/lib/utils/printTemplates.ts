import { formatCurrency } from '@/lib/utils';

export interface PrintItem {
  nombre: string;
  cantidad: number;
  precio: number;
  unidad?: string;
}

export interface PrintTicketParams {
  ticketNumber: string | number;
  fecha: string;
  cliente?: string;
  metodoPago?: string;
  items: PrintItem[];
  subtotal: number;
  descuento?: number;
  recargo?: number;
  totalFinal: number;
}

export interface PrintDocumentParams {
  documentNumber: string;
  fecha: string;
  cliente: string;
  direccion?: string;
  localidad?: string;
  cuit?: string;
  telefono?: string;
  metodoPago?: string;
  observaciones?: string;
  items: PrintItem[];
  subtotal: number;
  descuento?: number;
  recargo?: number;
  totalFinal: number;
}

/**
 * Genera el HTML para Ticket Térmico de Venta (180px de ancho) exactamente igual a Electron
 */
export function generateThermalTicketHTML(data: PrintTicketParams): string {
  const {
    ticketNumber,
    fecha,
    cliente = 'Consumidor Final',
    metodoPago = 'Efectivo',
    items,
    subtotal,
    descuento = 0,
    recargo = 0,
    totalFinal,
  } = data;

  const dateObj = new Date(fecha);
  const formattedDate = dateObj.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsHtml = items
    .map(
      (item) => `
    <div style="margin-bottom: 4px;">
      <div style="font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.nombre}</div>
      <div style="display: flex; justify-content: space-between; font-size: 9px; color: #333;">
        <span>${item.cantidad} ${item.unidad || 'u'} x $${Number(item.precio).toFixed(2)}</span>
        <span>$${Number(item.precio * item.cantidad).toFixed(2)}</span>
      </div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Ticket #${ticketNumber}</title>
    <style>
      @media print {
        body {
          font-family: 'Courier New', monospace;
          width: 180px;
          margin: 0;
          padding: 4px;
          font-size: 9px;
          font-weight: bold;
          background: white;
          color: black;
          line-height: 1.1;
        }
        .no-print { display: none !important; }
      }
      @media screen {
        body {
          font-family: 'Courier New', monospace;
          width: 180px;
          margin: 10px auto;
          padding: 10px;
          font-size: 10px;
          font-weight: bold;
          background: white;
          color: black;
          line-height: 1.2;
          border: 1px dashed #ccc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      }
      .header {
        text-align: center;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px dashed #000;
      }
      .company-title {
        font-size: 13px;
        font-weight: 900;
        margin: 2px 0;
        text-transform: uppercase;
      }
      .company-sub {
        font-size: 8px;
        margin-bottom: 4px;
      }
      .divider {
        border-top: 1px dashed #000;
        margin: 6px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        margin-bottom: 2px;
      }
      .total-box {
        margin-top: 6px;
        padding-top: 4px;
        border-top: 1px dashed #000;
        font-size: 10px;
      }
      .grand-total {
        font-size: 12px;
        font-weight: 900;
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
      }
      .footer {
        text-align: center;
        margin-top: 10px;
        font-size: 8px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-title">LA PERLA</div>
      <div class="company-sub">Ferretería & Insumos</div>
      <div style="font-size: 9px;">Ticket #${ticketNumber}</div>
      <div style="font-size: 8px; color: #555;">${formattedDate}</div>
    </div>

    <div class="info-row">
      <span>Cliente:</span>
      <span style="font-weight: bold;">${cliente}</span>
    </div>
    <div class="info-row">
      <span>Pago:</span>
      <span>${metodoPago}</span>
    </div>

    <div class="divider"></div>

    <div class="items-container">
      ${itemsHtml}
    </div>

    <div class="total-box">
      <div class="info-row">
        <span>Subtotal:</span>
        <span>$${Number(subtotal).toFixed(2)}</span>
      </div>
      ${
        descuento > 0
          ? `<div class="info-row" style="color: #b91c1c;"><span>Descuento:</span><span>-$${Number(descuento).toFixed(2)}</span></div>`
          : ''
      }
      ${
        recargo > 0
          ? `<div class="info-row"><span>Recargo:</span><span>+$${Number(recargo).toFixed(2)}</span></div>`
          : ''
      }
      <div class="grand-total">
        <span>TOTAL:</span>
        <span>$${Number(totalFinal).toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <div>¡Gracias por su compra!</div>
      <div style="margin-top: 2px;">Documento de control interno</div>
    </div>

    <script>
      setTimeout(() => { window.print(); }, 300);
    </script>
  </body>
</html>
  `;
}

/**
 * Genera el HTML para Presupuesto A4 Talonario exactamente igual a Electron
 */
export function generatePresupuestoHTML(data: PrintDocumentParams): string {
  const {
    documentNumber,
    fecha,
    cliente = 'Consumidor Final',
    direccion = '',
    localidad = '',
    cuit = '',
    telefono = '',
    items,
    subtotal,
    descuento = 0,
    recargo = 0,
    totalFinal,
    observaciones = '',
  } = data;

  const dateObj = new Date(fecha);
  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  const anio = String(dateObj.getFullYear());

  const minRows = 12;
  let rowsHtml = '';

  items.forEach((it) => {
    rowsHtml += `
      <tr>
        <td style="text-align: center; font-weight: bold; border-right: 1px solid #000; padding: 6px;">${it.cantidad}</td>
        <td style="border-right: 1px solid #000; padding: 6px;">${it.nombre}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 6px;">$${Number(it.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; padding: 6px;">$${Number(it.precio * it.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  for (let i = items.length; i < minRows; i++) {
    rowsHtml += `
      <tr style="height: 24px;">
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Presupuesto ${documentNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .no-print { display: none !important; }
    }
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000;
      background-color: #fff;
      margin: 0;
      padding: 10px;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      border: 2px solid #000;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 12px;
      position: relative;
    }
    .letter-x {
      position: absolute;
      top: -2px;
      left: 50%;
      transform: translateX(-50%);
      border: 2px solid #000;
      width: 32px;
      height: 32px;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .company-title { font-size: 18px; font-weight: 900; }
    .company-info { font-size: 11px; line-height: 1.4; }
    .doc-number { font-size: 18px; font-weight: 900; text-align: right; }
    .client-box {
      border: 1.5px solid #000;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 11.5px;
      margin-bottom: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      font-size: 11px;
      margin-bottom: 12px;
    }
    th {
      background: #f1f5f9;
      border-bottom: 2px solid #000;
      padding: 6px;
      text-transform: uppercase;
      font-size: 10px;
    }
    .totals-box {
      margin-left: auto;
      width: 260px;
      border: 2px solid #000;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .grand-total { border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; font-size: 14px; font-weight: 900; color: #0284c7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-box">
      <div class="letter-x">X</div>
      <div class="company-info">
        <div class="company-title">LA PERLA DE LA MAÑANA</div>
        <div>Ferretería, Sanitarios y Herramientas</div>
        <div>Tel: (03482) 420-000 • WhatsApp: +54 9 3482 000000</div>
      </div>
      <div class="doc-number">
        <div>PRESUPUESTO</div>
        <div style="font-size: 14px; color: #333; margin-top: 4px;">N° ${documentNumber}</div>
        <div style="font-size: 11px; font-weight: normal; margin-top: 4px;">Fecha: ${dia}/${mes}/${anio}</div>
      </div>
    </div>

    <div class="client-box">
      <div><strong>Cliente:</strong> ${cliente}</div>
      <div><strong>CUIT / DNI:</strong> ${cuit || '-'}</div>
      <div><strong>Dirección:</strong> ${direccion || '-'}</div>
      <div><strong>Localidad:</strong> ${localidad || '-'}</div>
      <div><strong>Teléfono:</strong> ${telefono || '-'}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%; border-right: 1px solid #000;">Cant.</th>
          <th style="width: 55%; border-right: 1px solid #000;">Descripción</th>
          <th style="width: 17.5%; border-right: 1px solid #000;">P. Unit.</th>
          <th style="width: 17.5%;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    ${observaciones ? `<div style="font-size: 11px; margin-bottom: 10px;"><strong>Observaciones:</strong> ${observaciones}</div>` : ''}

    <div class="totals-box">
      <div class="totals-row"><span>Subtotal:</span><span>$${Number(subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      ${descuento > 0 ? `<div class="totals-row" style="color: #b91c1c;"><span>Descuento:</span><span>-$${Number(descuento).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>` : ''}
      ${recargo > 0 ? `<div class="totals-row"><span>Recargo:</span><span>+$${Number(recargo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>` : ''}
      <div class="totals-row grand-total"><span>TOTAL:</span><span>$${Number(totalFinal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
    </div>

    <div style="margin-top: 20px; font-size: 9px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 6px;">
      Documento no válido como factura. Presupuesto válido por 15 días.
    </div>
  </div>

  <script>
    setTimeout(() => { window.print(); }, 300);
  </script>
</body>
</html>
  `;
}

/**
 * Genera el HTML para Remito A4 de Entrega exactamente igual a Electron
 */
export function generateRemitoHTML(data: PrintDocumentParams): string {
  const {
    documentNumber,
    fecha,
    cliente = 'Consumidor Final',
    direccion = '',
    localidad = '',
    cuit = '',
    telefono = '',
    metodoPago = 'Efectivo',
    items,
    subtotal,
    descuento = 0,
    recargo = 0,
    totalFinal,
    observaciones = '',
  } = data;

  const dateObj = new Date(fecha);
  const dia = String(dateObj.getDate()).padStart(2, '0');
  const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
  const anio = String(dateObj.getFullYear());

  const minRows = 10;
  let rowsHtml = '';

  items.forEach((it) => {
    rowsHtml += `
      <tr>
        <td style="text-align: center; font-weight: bold; border-right: 1px solid #000; padding: 6px;">${it.cantidad}</td>
        <td style="border-right: 1px solid #000; padding: 6px;">${it.nombre}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 6px;">$${Number(it.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; padding: 6px;">$${Number(it.precio * it.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  for (let i = items.length; i < minRows; i++) {
    rowsHtml += `
      <tr style="height: 24px;">
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td style="border-right: 1px solid #000;">&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Remito ${documentNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .no-print { display: none !important; }
    }
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000;
      background-color: #fff;
      margin: 0;
      padding: 10px;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      border: 2px solid #000;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 12px;
      position: relative;
    }
    .letter-r {
      position: absolute;
      top: -2px;
      left: 50%;
      transform: translateX(-50%);
      border: 2px solid #000;
      width: 32px;
      height: 32px;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .company-title { font-size: 18px; font-weight: 900; }
    .company-info { font-size: 11px; line-height: 1.4; }
    .doc-number { font-size: 18px; font-weight: 900; text-align: right; }
    .client-box {
      border: 1.5px solid #000;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 11.5px;
      margin-bottom: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      font-size: 11px;
      margin-bottom: 12px;
    }
    th {
      background: #f1f5f9;
      border-bottom: 2px solid #000;
      padding: 6px;
      text-transform: uppercase;
      font-size: 10px;
    }
    .totals-box {
      margin-left: auto;
      width: 260px;
      border: 2px solid #000;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
    .grand-total { border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; font-size: 14px; font-weight: 900; color: #d97706; }
    .signature-box {
      margin-top: 30px;
      border: 1.5px solid #000;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .signature-line {
      width: 200px;
      border-top: 1px solid #000;
      text-align: center;
      padding-top: 4px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-box">
      <div class="letter-r">R</div>
      <div class="company-info">
        <div class="company-title">LA PERLA DE LA MAÑANA</div>
        <div>Ferretería, Sanitarios y Herramientas</div>
        <div>Tel: (03482) 420-000 • Comprobante de Entrega</div>
      </div>
      <div class="doc-number">
        <div>REMITO DE ENTREGA</div>
        <div style="font-size: 14px; color: #333; margin-top: 4px;">N° ${documentNumber}</div>
        <div style="font-size: 11px; font-weight: normal; margin-top: 4px;">Fecha: ${dia}/${mes}/${anio}</div>
      </div>
    </div>

    <div class="client-box">
      <div><strong>Destinatario / Cliente:</strong> ${cliente}</div>
      <div><strong>CUIT / DNI:</strong> ${cuit || '-'}</div>
      <div><strong>Dirección de Entrega:</strong> ${direccion || '-'}</div>
      <div><strong>Localidad:</strong> ${localidad || '-'}</div>
      <div><strong>Teléfono:</strong> ${telefono || '-'}</div>
      <div><strong>Condición de Pago:</strong> ${metodoPago}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%; border-right: 1px solid #000;">Cant.</th>
          <th style="width: 55%; border-right: 1px solid #000;">Descripción del Producto</th>
          <th style="width: 17.5%; border-right: 1px solid #000;">P. Unit.</th>
          <th style="width: 17.5%;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    ${observaciones ? `<div style="font-size: 11px; margin-bottom: 10px;"><strong>Observaciones de Entrega:</strong> ${observaciones}</div>` : ''}

    <div class="totals-box">
      <div class="totals-row"><span>Subtotal:</span><span>$${Number(subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      ${descuento > 0 ? `<div class="totals-row" style="color: #b91c1c;"><span>Descuento:</span><span>-$${Number(descuento).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>` : ''}
      ${recargo > 0 ? `<div class="totals-row"><span>Recargo:</span><span>+$${Number(recargo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>` : ''}
      <div class="totals-row grand-total"><span>TOTAL REMITIDO:</span><span>$${Number(totalFinal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
    </div>

    <div class="signature-box">
      <div class="signature-line">Firma del Conforme</div>
      <div class="signature-line">Aclaración y DNI</div>
    </div>

    <div style="margin-top: 15px; font-size: 9px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 6px;">
      Documento no válido como factura. Mercadería recibida a entera satisfacción.
    </div>
  </div>

  <script>
    setTimeout(() => { window.print(); }, 300);
  </script>
</body>
</html>
  `;
}
