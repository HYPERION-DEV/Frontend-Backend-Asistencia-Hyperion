// src/app/api/v1/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistanceInMeters } from '@/lib/geo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, actionType, lat, lng, signature, qrContent } = body; 
    // actionType admite: 'CHECK_IN' | 'LUNCH_START' | 'LUNCH_END' | 'CHECK_OUT'

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

    // Validación de QR en modo presencial
    if (type === 'PRESENTIAL_QR') {
      if (!qrContent || qrContent !== user.company.qrSecret) {
        return NextResponse.json(
          { error: 'Código QR de oficina inválido' },
          { status: 400 }
        );
      }
    }

    // Validación de rango para métodos presenciales (Oficina)
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
    } 
    // Validación de domicilio y cuota mensual en Home Office
    else if (type === 'HOME_OFFICE') {
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
    // 3. REGISTRO SEGÚN EL CICLO (CHECK_IN / REFRIGERIO / CHECK_OUT)
    // ---------------------------------------------------------
    let record = await prisma.attendanceRecord.findFirst({
      where: { userId: user.id, date: today },
    });

    const currentAction = actionType || 'CHECK_IN';

    // A) REGISTRO DE INGRESO (CHECK_IN)
    if (currentAction === 'CHECK_IN') {
      if (record) {
        return NextResponse.json(
          { error: 'Ya registró su entrada el día de hoy.' },
          { status: 400 }
        );
      }

      // Cálculo de Tardanza según hora de entrada y tolerancia
      const [workHour, workMin] = user.workStartTime.split(':').map(Number);
      const graceLimitTime = new Date(serverTimestamp);
      graceLimitTime.setHours(workHour, workMin + user.toleranceMinutes, 0, 0);

      let lateMinutes = 0;
      let status: 'PRESENT' | 'LATE' = 'PRESENT';

      if (serverTimestamp > graceLimitTime) {
        status = 'LATE';
        const diffMs = serverTimestamp.getTime() - graceLimitTime.getTime();
        lateMinutes = Math.floor(diffMs / (1000 * 60));
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

    // B) INICIO DE REFRIGERIO (LUNCH_START)
    else if (currentAction === 'LUNCH_START') {
      if (!record) {
        return NextResponse.json({ error: 'Debe marcar su entrada primero.' }, { status: 400 });
      }
      if (record.lunchStart) {
        return NextResponse.json({ error: 'Ya registró inicio de refrigerio el día de hoy.' }, { status: 400 });
      }

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { lunchStart: serverTimestamp },
      });

      return NextResponse.json({
        success: true,
        action: 'LUNCH_START',
        message: 'Inicio de refrigerio registrado con éxito',
        record,
      });
    }

    // C) FIN DE REFRIGERIO (LUNCH_END)
    else if (currentAction === 'LUNCH_END') {
      if (!record || !record.lunchStart) {
        return NextResponse.json({ error: 'No ha registrado inicio de refrigerio previamente.' }, { status: 400 });
      }
      if (record.lunchEnd) {
        return NextResponse.json({ error: 'Ya registró fin de refrigerio el día de hoy.' }, { status: 400 });
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

    // D) REGISTRO DE SALIDA (CHECK_OUT)
    else if (currentAction === 'CHECK_OUT') {
      if (!record || !record.checkIn) {
        return NextResponse.json({ error: 'Debe marcar su entrada primero.' }, { status: 400 });
      }
      if (record.checkOut) {
        return NextResponse.json({ error: 'Ya registró su salida el día de hoy.' }, { status: 400 });
      }

      // Cálculo de Horas Extras (Jornada laboral de 8 horas / 480 minutos)
      const hoursWorkedMs = serverTimestamp.getTime() - record.checkIn.getTime();
      const totalMinutesWorked = Math.floor(hoursWorkedMs / (1000 * 60));
      const standardShiftMinutes = 8 * 60; // 480 min
      const overtimeMinutes = totalMinutesWorked > standardShiftMinutes ? totalMinutesWorked - standardShiftMinutes : 0;

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOut: serverTimestamp,
          overtimeMinutes,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'CHECK_OUT',
        message: 'Salida registrada con éxito',
        overtimeMinutes,
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