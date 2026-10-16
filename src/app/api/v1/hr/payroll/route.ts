// src/app/api/v1/hr/payroll/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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

    const payrollReport = users.map((u) => {
      const baseSalary = u.baseSalary || 0;

      // TODO EL CONTROL PROVIENE DEL RÉGIMEN ASIGNADO
      const policy = u.payrollPolicy;
      const daysInMonth = policy?.daysInMonth || 30;
      const hoursPerDay = policy?.hoursPerDay || 8.0;
      const factor25 = policy?.overtimeFirst2HoursRate || 1.25;
      const factor35 = policy?.overtimeNextHoursRate || 1.35;

      // FÓRMULAS DE COSTO DE TIEMPO
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

      // IMPORTES MONETARIOS
      const lateDiscount = Math.round((totalLateMinutes * minuteRate) * 100) / 100;
      const overtime25Pay = Math.round((totalOvertime25Minutes * (minuteRate * factor25)) * 100) / 100;
      const overtime35Pay = Math.round((totalOvertime35Minutes * (minuteRate * factor35)) * 100) / 100;
      
      const totalOvertimePay = Math.round((overtime25Pay + overtime35Pay) * 100) / 100;
      const netSalary = Math.round((baseSalary + totalOvertimePay - lateDiscount) * 100) / 100;

      return {
        userId: u.id,
        fullName: `${u.name} ${u.lastName}`,
        docType: u.docType || 'DNI',
        dni: u.dni,
        jobTitle: u.jobTitle,
        regimenName: policy?.name || 'Estándar General 728',
        baseSalary,
        dailyRate: Math.round(dailyRate * 100) / 100,
        hourlyRate: Math.round(hourlyRate * 100) / 100,
        minuteRate: Number(minuteRate.toFixed(4)),
        
        totalLateMinutes,
        totalOvertime25Minutes,
        totalOvertime35Minutes,

        lateDiscount,
        overtime25Pay,
        overtime35Pay,
        totalOvertimePay,
        netSalary,
      };
    });

    return NextResponse.json({
      success: true,
      period: monthParam && yearParam ? `${monthParam}/${yearParam}` : 'Consolidado General',
      company: users[0]?.company?.name || 'HYPERION DIGITAL SECURITY S.A.C.',
      ruc: users[0]?.company?.ruc || '20608810987',
      payroll: payrollReport,
    });
  } catch (error: any) {
    console.error('❌ Error calculando planilla:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}