// src/app/api/v1/reports/payroll-excel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    let dateFilter = {};
    if (monthParam && yearParam) {
      const month = parseInt(monthParam);
      const year = parseInt(yearParam);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = { date: { gte: startDate, lte: endDate } };
    }

    const users = await prisma.user.findMany({
      include: {
        company: true,
        payrollPolicy: true,
        attendanceRecords: {
          where: dateFilter,
        },
      },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pre-Nómina Mensual');

    // 1. Configuración de Columnas Financieras
    worksheet.columns = [
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'Trabajador', key: 'worker', width: 28 },
      { header: 'Cargo / Puesto', key: 'jobTitle', width: 22 },
      { header: 'Régimen Laboral', key: 'policy', width: 25 },
      { header: 'Sueldo Base (S/)', key: 'baseSalary', width: 16 },
      { header: 'Tarifa / Hora (S/)', key: 'hourlyRate', width: 16 },
      { header: 'Min. Tardanza', key: 'lateMinutes', width: 14 },
      { header: 'Desc. Tardanza (S/)', key: 'lateDiscount', width: 18 },
      { header: 'H.E. 25% (S/)', key: 'overtime25Pay', width: 15 },
      { header: 'H.E. 35% (S/)', key: 'overtime35Pay', width: 15 },
      { header: 'Total H.E. (S/)', key: 'totalOvertimePay', width: 16 },
      { header: 'Neto a Pagar (S/)', key: 'netSalary', width: 18 },
    ];

    // 2. Procesar Cálculos Monetarios
    users.forEach((u) => {
      const policy = u.payrollPolicy;
      const baseSalary = u.baseSalary || 0;
      const daysInMonth = policy?.daysInMonth || 30;
      const hoursPerDay = policy?.hoursPerDay || 8.0;
      const factor25 = policy?.overtimeFirst2HoursRate || 1.25;
      const factor35 = policy?.overtimeNextHoursRate || 1.35;

      const dailyRate = baseSalary > 0 ? baseSalary / daysInMonth : 0;
      const hourlyRate = dailyRate > 0 ? dailyRate / hoursPerDay : 0;
      const minuteRate = hourlyRate / 60;

      let totalLateMinutes = 0;
      let totalOvertime25Minutes = 0;
      let totalOvertime35Minutes = 0;

      u.attendanceRecords.forEach((r) => {
        totalLateMinutes += r.lateMinutes || 0;
        if (r.isOvertimeApproved || r.isModifiedByHR || (r.overtimeMinutes && r.overtimeMinutes > 0)) {
          totalOvertime25Minutes += r.overtime25Minutes || 0;
          totalOvertime35Minutes += r.overtime35Minutes || 0;
        }
      });

      const lateDiscount = Math.round((totalLateMinutes * minuteRate) * 100) / 100;
      const overtime25Pay = Math.round((totalOvertime25Minutes * (minuteRate * factor25)) * 100) / 100;
      const overtime35Pay = Math.round((totalOvertime35Minutes * (minuteRate * factor35)) * 100) / 100;
      const totalOvertimePay = Math.round((overtime25Pay + overtime35Pay) * 100) / 100;
      const netSalary = Math.round((baseSalary + totalOvertimePay - lateDiscount) * 100) / 100;

      const row = worksheet.addRow({
        dni: u.dni,
        worker: `${u.name} ${u.lastName}`,
        jobTitle: u.jobTitle,
        policy: policy?.name || 'Estándar General 728',
        baseSalary,
        hourlyRate: Number(hourlyRate.toFixed(2)),
        lateMinutes: totalLateMinutes,
        lateDiscount,
        overtime25Pay,
        overtime35Pay,
        totalOvertimePay,
        netSalary,
      });

      // Formato numérico de moneda peruana (S/)
      row.getCell('baseSalary').numFmt = '"S/"#,##0.00';
      row.getCell('hourlyRate').numFmt = '"S/"#,##0.00';
      row.getCell('lateDiscount').numFmt = '"S/"#,##0.00';
      row.getCell('overtime25Pay').numFmt = '"S/"#,##0.00';
      row.getCell('overtime35Pay').numFmt = '"S/"#,##0.00';
      row.getCell('totalOvertimePay').numFmt = '"S/"#,##0.00';
      row.getCell('netSalary').numFmt = '"S/"#,##0.00';
    });

    // 3. AutoFiltro y Estilos Corporativos
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: users.length + 1, column: 12 },
    };

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
        'Content-Disposition': `attachment; filename=Liquidacion_Planilla_HYPERION_${yearParam || 'Consolidado'}_${monthParam || 'General'}.xlsx`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}