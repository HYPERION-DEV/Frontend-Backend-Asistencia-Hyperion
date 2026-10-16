// src/app/api/v1/reports/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userDni = searchParams.get('dni');
    const month = searchParams.get('month');
    const year = searchParams.get('year') || String(new Date().getFullYear());

    // Construcción de filtros dinámicos
    const whereCondition: any = {};

    if (userDni && userDni !== 'ALL') {
      whereCondition.user = { dni: userDni };
    }

    if (month && month !== 'ALL') {
      const monthNum = parseInt(month, 10);
      const startDate = new Date(parseInt(year), monthNum - 1, 1);
      const endDate = new Date(parseInt(year), monthNum, 0, 23, 59, 59);
      whereCondition.date = { gte: startDate, lte: endDate };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereCondition,
      include: { 
        user: { 
          include: { company: true } 
        } 
      },
      orderBy: { date: 'desc' },
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron registros de asistencia para los filtros seleccionados.' },
        { status: 404 }
      );
    }

    const company = records[0]?.user.company;
    const isSingleWorker = userDni && userDni !== 'ALL';
    const workerInfo = isSingleWorker ? records[0]?.user : null;

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // --- MARCA DE AGUA ANTI-ALTERACIÓN ---
    doc.save();
    doc.opacity(0.04);
    doc.rotate(45, { origin: [300, 300] });
    doc.fontSize(36).text(`RUC: ${company?.ruc || '20608810987'} - INALTERABLE`, 50, 300);
    doc.restore();

    // --- ENCABEZADO OFICIAL SUNAFIL ---
    doc.fontSize(14).font('Helvetica-Bold').text(company?.name || 'HYPERION DIGITAL SECURITY S.A.C.', 40, 40);
    doc.fontSize(10).font('Helvetica').text(`RUC: ${company?.ruc || '20608810987'}`, 40, 58);
    doc.text(`REGISTRO OFICIAL DE CONTROL DE ASISTENCIA Y JORNADA LABORAL`, 40, 72);
    doc.moveTo(40, 88).lineTo(555, 88).stroke();

    let topY = 100;

    // --- DATOS DEL TRABAJADOR (SI SE FILTRÓ POR UN EMPLEADO ESPECÍFICO) ---
    if (workerInfo) {
      doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL TRABAJADOR:', 40, topY);
      doc.fontSize(9).font('Helvetica')
         .text(`Apellidos y Nombres: ${workerInfo.name} ${workerInfo.lastName}`, 40, topY + 15)
         .text(`${workerInfo.docType || 'DNI'}: ${workerInfo.dni}`, 300, topY + 15)
         .text(`Cargo / Puesto: ${workerInfo.jobTitle || 'Empleado'}`, 40, topY + 28);
      
      topY += 45;
      doc.moveTo(40, topY).lineTo(555, topY).stroke();
      topY += 12;
    }

    // --- CABECERA DE LA TABLA ---
    doc.fontSize(8).font('Helvetica-Bold')
       .text('Fecha', 45, topY)
       .text('Empleado', 105, topY)
       .text('Ingreso', 215, topY)
       .text('Salida', 270, topY)
       .text('Tardanza', 325, topY)
       .text('HE 25%', 385, topY)
       .text('HE 35%', 435, topY)
       .text('Método', 485, topY);

    doc.moveTo(40, topY + 12).lineTo(555, topY + 12).stroke();
    topY += 18;
    doc.font('Helvetica');

    records.forEach((r) => {
      // Control de salto de página
      if (topY > 750) {
        doc.addPage();
        topY = 40;
      }

      const dateStr = r.date ? new Date(r.date).toISOString().split('T')[0] : '--';
      const checkInStr = r.checkIn ? new Date(r.checkIn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--';
      const checkOutStr = r.checkOut ? new Date(r.checkOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--';

      doc.text(dateStr, 45, topY)
         .text(`${r.user.name} ${r.user.lastName.substring(0, 8)}.`, 105, topY)
         .text(checkInStr, 215, topY)
         .text(checkOutStr, 270, topY)
         .text(`${r.lateMinutes} min`, 325, topY)
         .text(`${r.overtime25Minutes || 0} min`, 385, topY)
         .text(`${r.overtime35Minutes || 0} min`, 435, topY)
         .text(r.type || 'PRESENCIAL', 485, topY);

      if (r.isModifiedByHR) {
        topY += 10;
        doc.fontSize(7).fillColor('red')
           .text(`* Corregido por RRHH: ${r.hrModificationReason || 'Ajuste manual'}`, 45, topY)
           .fillColor('black').fontSize(8);
      }

      topY += 16;
    });

    // --- PIE DE PÁGINA / INTEGRIDAD SHA-256 (ISO 27001) ---
    const footerY = 790;
    doc.fontSize(7).fillColor('gray')
       .text(`Documento Inalterable generado por Hyperion Digital Security S.A.C. | Fecha de emisión: ${new Date().toLocaleString('es-PE')}`, 40, footerY);

    doc.end();

    await new Promise((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Registro_SUNAFIL_${userDni || 'General'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error generando PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}