// src/app/api/v1/admin/attendance/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Resolver los parámetros de la ruta (Next.js 15+)
    const resolvedParams = await params;
    const recordId = resolvedParams.id;

    if (!recordId || recordId === 'undefined') {
      return NextResponse.json(
        { error: 'El ID del registro de asistencia no fue proporcionado.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { newCheckIn, newCheckOut, reason, adminId } = body;

    const oldRecord = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { user: true },
    });

    if (!oldRecord) {
      return NextResponse.json(
        { error: 'Registro de asistencia no encontrado.' },
        { status: 404 }
      );
    }

    // Helper para parsear la hora
    const parseDateTime = (baseDate: Date, timeStr?: string) => {
      if (!timeStr) return null;
      if (timeStr.includes('T') && !isNaN(Date.parse(timeStr))) {
        return new Date(timeStr);
      }
      
      const cleanTime = timeStr.replace(/[^0-9:]/g, '').trim();
      const parts = cleanTime.split(':');
      if (parts.length < 2) return null;

      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      const d = new Date(baseDate);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const checkInDate = newCheckIn
      ? parseDateTime(oldRecord.date, newCheckIn)
      : oldRecord.checkIn;

    const checkOutDate = newCheckOut
      ? parseDateTime(oldRecord.date, newCheckOut)
      : oldRecord.checkOut;

    let lateMinutes = 0;
    let status: 'PRESENT' | 'LATE' = 'PRESENT';

    if (checkInDate) {
      const [workHour, workMin] = oldRecord.user.workStartTime
        .split(':')
        .map(Number);
      const graceLimitTime = new Date(checkInDate);
      graceLimitTime.setHours(workHour, workMin + oldRecord.user.toleranceMinutes, 0, 0);

      if (checkInDate > graceLimitTime) {
        status = 'LATE';
        const diffMs = checkInDate.getTime() - graceLimitTime.getTime();
        lateMinutes = Math.floor(diffMs / (1000 * 60));
      }
    }

    // Actualizar registro en BD
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        lateMinutes,
        status,
        observations: `Editado por Administración: ${reason}`,
      },
    });

    // Registrar Pista de Auditoría ISO 27001
    let performerId = adminId;
    if (!performerId) {
      const adminUser = await prisma.user.findFirst({
        where: { OR: [{ role: 'ADMIN' }, { role: 'HR' }] },
      });
      performerId = adminUser?.id || oldRecord.userId;
    }

    await prisma.auditLog.create({
      data: {
        performedById: performerId,
        entity: 'AttendanceRecord',
        entityId: recordId,
        action: 'MANUAL_ATTENDANCE_EDIT',
        previousValue: JSON.stringify({
          checkIn: oldRecord.checkIn,
          checkOut: oldRecord.checkOut,
        }),
        newValue: JSON.stringify({
          checkIn: updatedRecord.checkIn,
          checkOut: updatedRecord.checkOut,
        }),
        reason: reason || 'Ajuste manual de hora de marcación',
      },
    });

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error: any) {
    console.error('❌ ERROR AL ACTUALIZAR MARCACIÓN:', error);
    return NextResponse.json(
      { error: 'Error actualizando marcación', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}