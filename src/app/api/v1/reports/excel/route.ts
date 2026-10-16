// src/app/api/v1/reports/excel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      dateFilter = { date: { gte: startDate, lte: endDate } };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: dateFilter,
      include: {
        user: { include: { payrollPolicy: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Crear Libro y Hoja Excel con ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Control de Asistencia');

    // Definir Columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'Trabajador', key: 'worker', width: 30 },
      { header: 'Régimen Laboral', key: 'policy', width: 25 },
      { header: 'Ingreso', key: 'checkIn', width: 12 },
      { header: 'Inicio Ref.', key: 'lunchStart', width: 12 },
      { header: 'Fin Ref.', key: 'lunchEnd', width: 12 },
      { header: 'Salida', key: 'checkOut', width: 12 },
      { header: 'Tardanza (min)', key: 'lateMinutes', width: 15 },
      { header: 'H.E. 25% (min)', key: 'overtime25', width: 15 },
      { header: 'H.E. 35% (min)', key: 'overtime35', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
    ];

    // Llenar Filas
    records.forEach((r) => {
      const u = r.user;
      worksheet.addRow({
        date: new Date(r.date).toISOString().split('T')[0],
        dni: u?.dni || 'N/A',
        worker: `${u?.name || ''} ${u?.lastName || ''}`,
        policy: u?.payrollPolicy?.name || 'Estándar General 728',
        checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        lunchStart: r.lunchStart ? new Date(r.lunchStart).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        lunchEnd: r.lunchEnd ? new Date(r.lunchEnd).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        lateMinutes: r.lateMinutes || 0,
        overtime25: r.overtime25Minutes || 0,
        overtime35: r.overtime35Minutes || 0,
        status: r.status,
      });
    });

    // 🏆 ACTIVAR AUTOFILTRO DE EXCEL EN LA CABECERA
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: records.length + 1, column: 12 },
    };

    // Estilo a la Cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '005F87' },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=Asistencia_HYPERION_${year || 'Todos'}_${month || 'Consolidado'}.xlsx`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}