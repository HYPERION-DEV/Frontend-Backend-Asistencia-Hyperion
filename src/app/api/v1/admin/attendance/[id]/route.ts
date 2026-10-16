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
    const { newCheckIn, newLunchStart, newLunchEnd, newCheckOut, reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'SUNAFIL exige un motivo justificado para la modificación manual.' },
        { status: 400 }
      );
    }

    const rawRecord = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        user: {
          include: { payrollPolicy: true },
        },
      },
    });

    if (!rawRecord || !rawRecord.user) {
      return NextResponse.json({ error: 'Registro de asistencia no encontrado' }, { status: 404 });
    }

    const record = rawRecord as typeof rawRecord & { user: any };
    const user = record.user;

    const dateObj = new Date(record.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 1. Reconstrucción de Fechas
    let updatedCheckIn = record.checkIn;
    if (newCheckIn && newCheckIn.includes(':')) {
      updatedCheckIn = new Date(`${dateStr}T${newCheckIn}:00.000`);
    }

    let updatedLunchStart = record.lunchStart;
    if (newLunchStart && newLunchStart.includes(':')) {
      updatedLunchStart = new Date(`${dateStr}T${newLunchStart}:00.000`);
    }

    let updatedLunchEnd = record.lunchEnd;
    if (newLunchEnd && newLunchEnd.includes(':')) {
      updatedLunchEnd = new Date(`${dateStr}T${newLunchEnd}:00.000`);
    }

    let updatedCheckOut = record.checkOut;
    if (newCheckOut && newCheckOut.includes(':')) {
      updatedCheckOut = new Date(`${dateStr}T${newCheckOut}:00.000`);
    }

    // 2. Cálculo de Tardanza (Solo afecta al ingreso)
    let lateMinutes = 0;
    let status: 'PRESENT' | 'LATE' = 'PRESENT';

    if (updatedCheckIn && user.workStartTime) {
      const [startHours, startMinutes] = user.workStartTime.split(':').map(Number);
      const expectedStartTime = new Date(`${dateStr}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:00.000`);
      const graceLimitTime = new Date(expectedStartTime.getTime() + (user.toleranceMinutes || 10) * 60 * 1000);

      if (updatedCheckIn > graceLimitTime) {
        status = 'LATE';
        const diffMs = updatedCheckIn.getTime() - expectedStartTime.getTime();
        const totalLateMinutes = Math.floor(diffMs / (1000 * 60));
        lateMinutes = Math.max(0, totalLateMinutes - (user.toleranceMinutes || 10));
      }
    }

    // 3. CÁLCULO PRECISO DE HORAS EXTRAS A PARTIR DE LA SALIDA OFICIAL
    let totalOvertimeMinutes = 0;
    let overtime25Minutes = 0;
    let overtime35Minutes = 0;

    if (updatedCheckOut && user.workStartTime) {
      const [workHour, workMin] = user.workStartTime.split(':').map(Number);
      
      // Horas del régimen (8h) + 1h de refrigerio = 9 horas en total
      const userHoursPerDay = user.payrollPolicy?.hoursPerDay || 8.0;
      const totalShiftHours = userHoursPerDay + 1.0; 

      // Salida Oficial = Hora Ingreso (09:00) + 9 horas = 18:00
      const officialCheckOut = new Date(
        new Date(`${dateStr}T${String(workHour).padStart(2, '0')}:${String(workMin).padStart(2, '0')}:00.000`).getTime() +
        totalShiftHours * 60 * 60 * 1000
      );

      // Si la marcación de salida supera las 18:00
      if (updatedCheckOut > officialCheckOut) {
        const diffMs = updatedCheckOut.getTime() - officialCheckOut.getTime();
        totalOvertimeMinutes = Math.floor(diffMs / (1000 * 60));
        
        // Tramo 25% (primeras 2 horas = hasta 120 min)
        overtime25Minutes = Math.min(totalOvertimeMinutes, 120);
        
        // Tramo 35% (a partir del minuto 121)
        overtime35Minutes = Math.max(0, totalOvertimeMinutes - 120);
      }
    }

    // 4. Actualizar registro en PostgreSQL
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        checkIn: updatedCheckIn,
        lunchStart: updatedLunchStart,
        lunchEnd: updatedLunchEnd,
        checkOut: updatedCheckOut,
        status,
        lateMinutes,
        overtimeMinutes: totalOvertimeMinutes,
        overtime25Minutes,
        overtime35Minutes,
        isModifiedByHR: true,
        hrModificationReason: reason.trim(),
        observations: `Editado por RRHH: ${reason.trim()}`,
      },
    });

    // 5. Auditoría
    await prisma.auditLog.create({
      data: {
        performedById: record.userId,
        entity: 'ATTENDANCE_RECORD',
        entityId: recordId,
        action: 'CORRECT_OVERTIME_EXACT',
        previousValue: `HE previas: ${record.overtimeMinutes} min`,
        newValue: `HE exactas: ${totalOvertimeMinutes} min (25%: ${overtime25Minutes}m, 35%: ${overtime35Minutes}m)`,
        reason: reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Marcación y Horas Extras recalculadas de forma exacta',
      record: updatedRecord,
    });
  } catch (error: any) {
    console.error('❌ Error actualizando asistencia:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}