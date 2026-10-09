// src/app/api/v1/hr/update-record/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { hrUserId, recordId, newCheckIn, reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'ISO 27001 exige una justificación detallada (mínimo 10 caracteres).' },
        { status: 400 }
      );
    }

    const previousRecord = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
    });

    if (!previousRecord) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    // 1. Actualizar el registro
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkIn: new Date(newCheckIn),
      },
    });

    // 2. Registrar en la tabla inmutable de auditoría
    await prisma.auditLog.create({
      data: {
        performedById: hrUserId,
        entity: 'AttendanceRecord',
        entityId: recordId,
        action: 'UPDATE_CHECKIN_TIME',
        previousValue: previousRecord.checkIn ? previousRecord.checkIn.toISOString() : null,
        newValue: new Date(newCheckIn).toISOString(),
        reason,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      },
    });

    return NextResponse.json({ success: true, updatedRecord });
  } catch (error) {
    return NextResponse.json({ error: 'Error al auditar la modificación' }, { status: 500 });
  }
}