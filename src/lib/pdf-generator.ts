// src/lib/pdf-generator.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PermissionData {
  id: string;
  userName: string;
  userDni: string;
  type: string;
  reason: string;
  startDate: string;
  endDate: string;
  employeeSignatureBase64?: string | null;
}

export async function generatePermissionPdfBase64(data: PermissionData): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Formato A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Mapeo de Enums a etiquetas legibles
  const typeMap: Record<string, string> = {
    MEDICAL_LEAVE: 'Descanso Médico (ESSALUD)',
    PERSONAL_PERMIT: 'Papeleta de Salida Particular',
    VACATION: 'Solicitud de Vacaciones',
    OFFICIAL_COMMISSION: 'Comisión de Servicio / Licencia',
  };

  const readableType = typeMap[data.type] || data.type;

  // Título
  page.drawText('PAPELETA DE PERMISO Y LICENCIA DIGITAL', {
    x: 100,
    y: 780,
    size: 16,
    font: fontBold,
    color: rgb(0, 0.37, 0.53),
  });

  page.drawText('Cumplimiento Normativo SUNAFIL / D.S. N° 004-2006-TR', {
    x: 130,
    y: 760,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  let y = 700;
  page.drawText(`Código de Solicitud: ${data.id}`, { x: 50, y, size: 10, font: fontBold });
  y -= 25;
  page.drawText(`Colaborador: ${data.userName}`, { x: 50, y, size: 11, font });
  page.drawText(`DNI: ${data.userDni}`, { x: 350, y, size: 11, font });
  y -= 25;
  page.drawText(`Tipo de Permiso: ${readableType}`, { x: 50, y, size: 11, font: fontBold });
  y -= 25;
  page.drawText(`Desde: ${new Date(data.startDate).toLocaleString('es-PE')}`, { x: 50, y, size: 10, font });
  page.drawText(`Hasta: ${new Date(data.endDate).toLocaleString('es-PE')}`, { x: 300, y, size: 10, font });
  y -= 35;

  page.drawText('Motivo Justificado:', { x: 50, y, size: 11, font: fontBold });
  y -= 20;
  page.drawText(data.reason || 'Sin motivo detallado', { x: 50, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 80;

  // Incrustar trazo de la firma táctil
  if (data.employeeSignatureBase64 && data.employeeSignatureBase64.includes('base64,')) {
    try {
      const base64Data = data.employeeSignatureBase64.split('base64,')[1].replace(/[\r\n\t ]/g, '');
      const pngImageBytes = Buffer.from(base64Data, 'base64');
      const pngImage = await pdfDoc.embedPng(pngImageBytes);

      page.drawText('Firma Táctil del Colaborador:', { x: 50, y: y + 10, size: 9, font: fontBold });
      page.drawImage(pngImage, {
        x: 50,
        y: y - 70,
        width: 150,
        height: 70,
      });
    } catch (e) {
      console.error('Error al incrustar firma PNG en PDF:', e);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
}