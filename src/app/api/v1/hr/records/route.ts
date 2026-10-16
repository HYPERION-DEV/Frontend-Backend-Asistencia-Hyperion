// src/app/api/v1/hr/records/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.attendanceRecord.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            dni: true,
            docType: true,
            jobTitle: true,
            workStartTime: true,
            toleranceMinutes: true,
            payrollPolicy: true,
            company: {
              select: {
                name: true,
                ruc: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formattedRecords = records.map((r) => ({
      ...r,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      checkIn: r.checkIn ? r.checkIn.toISOString() : null,
      lunchStart: r.lunchStart ? r.lunchStart.toISOString() : null, // 👈 Exportación explícita
      lunchEnd: r.lunchEnd ? r.lunchEnd.toISOString() : null,       // 👈 Exportación explícita
      checkOut: r.checkOut ? r.checkOut.toISOString() : null,
      user: {
        ...r.user,
        companyName: r.user.company?.name || 'HYPERION DIGITAL SECURITY S.A.C.',
        companyRuc: r.user.company?.ruc || '20608810987',
      },
    }));

    return NextResponse.json({ success: true, records: formattedRecords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}