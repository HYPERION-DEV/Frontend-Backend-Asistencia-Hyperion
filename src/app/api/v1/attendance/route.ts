// src/app/api/v1/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistanceInMeters } from '@/lib/geo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, actionType, lat, lng, signature, qrContent } = body; 

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Las coordenadas GPS son inválidas o no fueron recibidas.' },
        { status: 400 }
      );
    }

    const serverTimestamp = new Date();
    const today = new Date(serverTimestamp);
    today.setHours(0, 0, 0, 0);

    // 1. BUSCAR TRABAJADOR EN LA BASE DE DATOS
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { dni: userId }] },
      include: { company: true, homeAddresses: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos' },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 2. VALIDACIÓN DE GEOCERCAS (OFICINA VS. HOME OFFICE)
    // ---------------------------------------------------------
    let homeOfficeRemaining = 0;

    if (type === 'PRESENTIAL_QR') {
      if (!qrContent || qrContent !== user.company.qrSecret) {
        return NextResponse.json(
          { error: 'Código QR de oficina inválido' },
          { status: 400 }
        );
      }
    }

    if (['PRESENTIAL_QR', 'PRESENTIAL_NFC', 'BIOMETRIC_FINGERPRINT', 'FACIAL_RECOGNITION'].includes(type)) {
      const distance = calculateDistanceInMeters(
        latitude,
        longitude,
        user.company.officeLat,
        user.company.officeLng
      );
      if (distance > user.company.radiusM) {
        return NextResponse.json(
          { error: `Fuera del rango de la oficina: ${Math.round(distance)}m (Límite: ${user.company.radiusM}m)` },
          { status: 403 }
        );
      }
    } else if (type === 'HOME_OFFICE') {
      if (user.homeAddresses.length === 0) {
        return NextResponse.json(
          { error: 'No tiene domicilios registrados para Home Office.' },
          { status: 400 }
        );
      }

      const startOfMonth = new Date(serverTimestamp.getFullYear(), serverTimestamp.getMonth(), 1);
      const endOfMonth = new Date(serverTimestamp.getFullYear(), serverTimestamp.getMonth() + 1, 0, 23, 59, 59);

      const homeOfficeCount = await prisma.attendanceRecord.count({
        where: {
          userId: user.id,
          type: 'HOME_OFFICE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      if (homeOfficeCount >= user.homeOfficeQuota && (actionType === 'CHECK_IN' || !actionType)) {
        return NextResponse.json(
          { error: `Excedió su cuota mensual de Home Office (${user.homeOfficeQuota} días).` },
          { status: 403 }
        );
      }

      const enRango = user.homeAddresses.some((addr) => {
        const dist = calculateDistanceInMeters(latitude, longitude, addr.latitude, addr.longitude);
        return dist <= 50.0;
      });

      if (!enRango) {
        return NextResponse.json(
          { error: 'No se encuentra en el rango de ninguno de sus domicilios registrados (Límite 50m).' },
          { status: 403 }
        );
      }

      homeOfficeRemaining = user.homeOfficeQuota - (homeOfficeCount + 1);
    }

    // ---------------------------------------------------------
    // 3. REGISTRO SEGÚN EL CICLO CON CUMPLIMIENTO SUNAFIL
    // ---------------------------------------------------------
    let record = await prisma.attendanceRecord.findFirst({
      where: { userId: user.id, date: today },
    });

    const currentAction = actionType || 'CHECK_IN';

    // A) REGISTRO DE INGRESO (CHECK_IN) - TOLERANCIA DEDUCIBLE
    if (currentAction === 'CHECK_IN') {
      if (record) {
        return NextResponse.json(
          { error: 'Ya registró su entrada el día de hoy.' },
          { status: 400 }
        );
      }

      // VALIDACIÓN LEY DE TELETRABAJO: Desconexión Digital (12 horas mínimas continuas)
      const lastRecord = await prisma.attendanceRecord.findFirst({
        where: { userId: user.id, checkOut: { not: null } },
        orderBy: { checkOut: 'desc' },
      });

      if (lastRecord && lastRecord.checkOut) {
        const restMs = serverTimestamp.getTime() - lastRecord.checkOut.getTime();
        const restHours = restMs / (1000 * 60 * 60);
        if (restHours < 12) {
          const remainingMinutes = Math.ceil((12 - restHours) * 60);
          return NextResponse.json(
            { error: `Infracción a la Ley de Teletrabajo: Debe cumplir 12 horas continuas de desconexión digital. Le faltan ${remainingMinutes} minuto(s).` },
            { status: 403 }
          );
        }
      }

      // Cálculo de Tardanza con Tolerancia Deducible
      const [workHour, workMin] = user.workStartTime.split(':').map(Number);
      const graceLimitTime = new Date(serverTimestamp);
      graceLimitTime.setHours(workHour, workMin + user.toleranceMinutes, 0, 0);

      let lateMinutes = 0;
      let status: 'PRESENT' | 'LATE' = 'PRESENT';

      if (serverTimestamp > graceLimitTime) {
        status = 'LATE';
        const expectedTime = new Date(serverTimestamp);
        expectedTime.setHours(workHour, workMin, 0, 0);
        
        const diffMs = serverTimestamp.getTime() - expectedTime.getTime();
        const totalLateMinutes = Math.floor(diffMs / (1000 * 60));

        // Descontar la tolerancia del tiempo total de tardanza
        lateMinutes = Math.max(0, totalLateMinutes - user.toleranceMinutes);
      }

      record = await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          date: today,
          checkIn: serverTimestamp,
          type,
          status,
          lateMinutes,
          latitude,
          longitude,
          employeeSignature: signature || null,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'CHECK_IN',
        message: 'Entrada registrada con éxito',
        status: record.status,
        lateMinutes,
        homeOfficeRemaining: type === 'HOME_OFFICE' ? homeOfficeRemaining : undefined,
        record,
      });
    } 

    // B) INICIO DE REFRIGERIO (LUNCH_START) - VENTANA DE 1:00 PM A 1:30 PM
    else if (currentAction === 'LUNCH_START') {
      if (!record) {
        return NextResponse.json({ error: 'Debe marcar su entrada primero.' }, { status: 400 });
      }
      if (record.lunchStart) {
        return NextResponse.json({ error: 'Ya registró inicio de refrigerio el día de hoy.' }, { status: 400 });
      }

      // Validar ventana horaria (13:00 a 13:30)
      const windowStart = new Date(serverTimestamp);
      windowStart.setHours(13, 0, 0, 0); // 1:00 PM

      const windowEnd = new Date(serverTimestamp);
      windowEnd.setHours(13, 30, 0, 0); // 1:30 PM

      if (serverTimestamp < windowStart) {
        return NextResponse.json(
          { error: 'El horario permitido para iniciar el refrigerio es a partir de la 1:00 PM.' },
          { status: 400 }
        );
      }

      if (serverTimestamp > windowEnd) {
        return NextResponse.json(
          { error: 'Ha superado la hora límite para salir a refrigerio (Máximo 1:30 PM).' },
          { status: 400 }
        );
      }

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { lunchStart: serverTimestamp },
      });

      return NextResponse.json({
        success: true,
        action: 'LUNCH_START',
        message: 'Inicio de refrigerio registrado con éxito. Recuerde que su tiempo de refrigerio es de 60 minutos.',
        record,
      });
    }

    // C) FIN DE REFRIGERIO (LUNCH_END) - VALIDACIÓN DE 60 MINUTOS DESDE LUNCH_START
    else if (currentAction === 'LUNCH_END') {
      if (!record || !record.lunchStart) {
        return NextResponse.json({ error: 'No ha registrado inicio de refrigerio previamente.' }, { status: 400 });
      }
      if (record.lunchEnd) {
        return NextResponse.json({ error: 'Ya registró fin de refrigerio el día de hoy.' }, { status: 400 });
      }

      const diffMs = serverTimestamp.getTime() - record.lunchStart.getTime();
      const lunchMinutes = Math.floor(diffMs / (1000 * 60));

      // Contar 60 minutos obligatorios a partir de la marcación de inicio
      if (lunchMinutes < 60) {
        const remaining = 60 - lunchMinutes;
        return NextResponse.json(
          { error: `Su tiempo de refrigerio configurado es de 60 minutos (1 hora). Le faltan ${remaining} minuto(s).` },
          { status: 400 }
        );
      }

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { lunchEnd: serverTimestamp },
      });

      return NextResponse.json({
        success: true,
        action: 'LUNCH_END',
        message: 'Fin de refrigerio registrado con éxito',
        record,
      });
    }

    // D) REGISTRO DE SALIDA (CHECK_OUT) - CÁLCULO SOBRETASAS LEY N° 28999 DESDE HORA OFICIAL
    else if (currentAction === 'CHECK_OUT') {
      if (!record || !record.checkIn) {
        return NextResponse.json({ error: 'Debe marcar su entrada primero.' }, { status: 400 });
      }
      if (record.checkOut) {
        return NextResponse.json({ error: 'Ya registró su salida el día de hoy.' }, { status: 400 });
      }

      // 1. Obtener la hora oficial de entrada asignada al trabajador (ej. "09:00")
      const [workHour, workMin] = user.workStartTime.split(':').map(Number);

      // 2. Definir la hora oficial de salida teórica (Entrada + 8h trabajo + 1h refrigerio = Entrada + 9h)
      const officialCheckOut = new Date(record.date);
      officialCheckOut.setHours(workHour + 9, workMin, 0, 0);

      // 3. Las Horas Extras comienzan a contarse ÚNICAMENTE después de pasar la hora oficial de salida
      let totalOvertimeMinutes = 0;
      if (serverTimestamp > officialCheckOut) {
        const diffMs = serverTimestamp.getTime() - officialCheckOut.getTime();
        totalOvertimeMinutes = Math.floor(diffMs / (1000 * 60));
      }

      // 4. Desglose en tramos del 25% (primeras 2 horas) y 35% (a partir de la 3ra hora)
      let overtime25Minutes = 0;
      let overtime35Minutes = 0;

      if (totalOvertimeMinutes > 0) {
        overtime25Minutes = Math.min(totalOvertimeMinutes, 120);
        overtime35Minutes = Math.max(0, totalOvertimeMinutes - 120);
      }

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOut: serverTimestamp,
          overtimeMinutes: totalOvertimeMinutes,
          overtime25Minutes,
          overtime35Minutes,
          isOvertimeApproved: false,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'CHECK_OUT',
        message: 'Salida registrada con éxito',
        overtimeMinutes: totalOvertimeMinutes,
        overtime25Minutes,
        overtime35Minutes,
        record,
      });
    }

    return NextResponse.json({ error: 'Acción de marcación no válida.' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Error interno en la API de Marcación:', error);
    return NextResponse.json(
      { error: 'Error interno en la marcación', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}