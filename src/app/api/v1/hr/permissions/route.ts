// src/app/api/v1/hr/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. OBTENER TODAS LAS SOLICITUDES (Soluciona el error 405 en el Dashboard Web)
export async function GET() {
  try {
    const permissions = await prisma.permissionRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            dni: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, permissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREAR SOLICITUD Y REGISTRAR FIRMA DIGITAL (APP MÓVIL / WEB)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, reason, startDate, endDate, signatureBase64 } = body;

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (userId, startDate, endDate).' },
        { status: 400 }
      );
    }

    const newPermission = await prisma.permissionRequest.create({
      data: {
        userId,
        type,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'PENDING',
        employeeSignature: signatureBase64 || null,
      },
      include: {
        user: { select: { id: true, name: true, lastName: true, dni: true } },
      },
    });

    // Auditoría ISO 27001 / SUNAFIL
    if (signatureBase64) {
      const isBiometric = signatureBase64 === 'BIOMETRIC_FINGERPRINT_VERIFIED';

      await prisma.auditLog.create({
        data: {
          performedById: userId,
          entity: 'PERMISSION_REQUEST',
          entityId: newPermission.id,
          action: isBiometric ? 'BIOMETRIC_FINGERPRINT_SIGNATURE' : 'EMPLOYEE_DIGITAL_SIGNATURE',
          newValue: signatureBase64,
          reason: isBiometric
            ? 'Solicitud autorizada y firmada mediante Huella Dactilar (Sensor Móvil)'
            : 'Solicitud adjunta con firma digital táctil',
        },
      });
    }

    return NextResponse.json({ success: true, permission: newPermission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. APROBAR O RECHAZAR SOLICITUD DESDE EL DASHBOARD DE RRHH
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, status, approvedBy } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'requestId y status son requeridos.' },
        { status: 400 }
      );
    }

    const updatedPermission = await prisma.permissionRequest.update({
      where: { id: requestId },
      data: {
        status,
        approvedBy: approvedBy || 'RRHH Administrator',
      },
      include: {
        user: { select: { id: true, name: true, lastName: true, dni: true } },
      },
    });

    // Auditoría de la acción
    await prisma.auditLog.create({
      data: {
        performedById: updatedPermission.userId,
        entity: 'PERMISSION_REQUEST',
        entityId: requestId,
        action: `PERMISSION_${status}`,
        reason: `Estado de permiso cambiado a ${status} por RRHH`,
      },
    });

    return NextResponse.json({ success: true, permission: updatedPermission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}