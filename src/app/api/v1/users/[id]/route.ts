// src/app/api/v1/admin/attendance/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const recordId = resolvedParams?.id;

    if (!recordId) {
      return NextResponse.json({ error: 'ID de registro no recibido' }, { status: 400 });
    }

    const body = await req.json();
    const { newCheckIn, newCheckOut, reason } = body;

    // 1. Buscar el registro original de asistencia y los datos del trabajador
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Registro de asistencia no encontrado' }, { status: 404 });
    }

    // 2. Helper para combinar la fecha original (YYYY-MM-DD) con la hora enviada ("HH:mm")
    const baseDate = new Date(record.date);
    
    let updatedCheckInDate: Date | null = record.checkIn;
    if (newCheckIn && newCheckIn.includes(':')) {
      const [inHours, inMinutes] = newCheckIn.split(':').map(Number);
      updatedCheckInDate = new Date(baseDate);
      updatedCheckInDate.setHours(inHours, inMinutes, 0, 0);
    }

    let updatedCheckOutDate: Date | null = record.checkOut;
    if (newCheckOut && newCheckOut.includes(':')) {
      const [outHours, outMinutes] = newCheckOut.split(':').map(Number);
      updatedCheckOutDate = new Date(baseDate);
      updatedCheckOutDate.setHours(outHours, outMinutes, 0, 0);
    }

    // 3. Recalcular Tardanza (si hay horario de entrada)
    let lateMinutes = 0;
    let status: 'PRESENT' | 'LATE' = 'PRESENT';

    if (updatedCheckInDate && record.user.workStartTime) {
      const [startHours, startMinutes] = record.user.workStartTime.split(':').map(Number);
      const expectedStartTime = new Date(baseDate);
      expectedStartTime.setHours(startHours, startMinutes + record.user.toleranceMinutes, 0, 0);

      if (updatedCheckInDate > expectedStartTime) {
        status = 'LATE';
        const diffMs = updatedCheckInDate.getTime() - expectedStartTime.getTime();
        lateMinutes = Math.floor(diffMs / (1000 * 60));
      }
    }

    // 4. Recalcular Horas Extras (si hay checkOut)
    let overtimeMinutes = 0;
    if (updatedCheckInDate && updatedCheckOutDate) {
      const diffMs = updatedCheckOutDate.getTime() - updatedCheckInDate.getTime();
      const workedMinutes = Math.floor(diffMs / (1000 * 60));
      const standardShiftMinutes = 8 * 60; // 8 horas laborales
      if (workedMinutes > standardShiftMinutes) {
        overtimeMinutes = workedMinutes - standardShiftMinutes;
      }
    }

    // 5. Actualizar registro en PostgreSQL
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkIn: updatedCheckInDate,
        checkOut: updatedCheckOutDate,
        status,
        lateMinutes,
        overtimeMinutes,
      },
    });

    // 6. Registrar en la Pista de Auditoría ISO 27001
    await prisma.auditLog.create({
      data: {
        performedById: record.userId,
        entity: 'AttendanceRecord',
        entityId: recordId,
        action: 'MANUAL_ATTENDANCE_CORRECTION',
        newValue: `CheckIn: ${newCheckIn}, CheckOut: ${newCheckOut}`,
        reason: reason || 'Ajuste manual de asistencia por Recursos Humanos',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Marcación corregida correctamente',
      record: updatedRecord,
    });
  } catch (error: any) {
    console.error('Error actualizando asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la marcación de asistencia', details: error?.message },
      { status: 500 }
    );
  }
}