// src/app/api/v1/hr/records/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.attendanceRecord.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedRecords = records.map((r) => ({
      id: r.id,
      // Formato YYYY-MM-DD para la columna Fecha
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '--',
      
      // Enviar las fechas en formato ISO puro para que el frontend las entienda sin romper
      checkIn: r.checkIn ? r.checkIn.toISOString() : null,
      checkOut: r.checkOut ? r.checkOut.toISOString() : null,
      lunchStart: r.lunchStart ? r.lunchStart.toISOString() : null,
      lunchEnd: r.lunchEnd ? r.lunchEnd.toISOString() : null,
      
      status: r.status,
      type: r.type || 'PRESENTIAL_QR', // Incluir tipo de marcación
      lateMinutes: r.lateMinutes || 0,
      overtimeMinutes: r.overtimeMinutes || 0,
      latitude: r.latitude || null,    // Incluir GPS
      longitude: r.longitude || null,  // Incluir GPS
      
      user: {
        id: r.user.id,
        name: r.user.name,
        lastName: r.user.lastName,
        dni: r.user.dni,
        jobTitle: r.user.jobTitle,
        baseSalary: r.user.baseSalary,
        discountRate: r.user.discountRate,
        homeOfficeQuota: r.user.homeOfficeQuota || 4,
      },
    }));

    return NextResponse.json({ success: true, records: formattedRecords });
  } catch (error: any) {
    console.error('❌ Error obteniendo registros de marcación:', error);
    return NextResponse.json(
      { success: false, error: 'Error cargando historial', records: [] },
      { status: 500 }
    );
  }
}