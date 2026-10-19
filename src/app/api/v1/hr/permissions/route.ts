// src/app/api/v1/hr/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePermissionPdfBase64 } from '../../../../../lib/pdf-generator';
import { CamercloudService } from '@/lib/camercloud';

// 1. OBTENER TODAS LAS SOLICITUDES
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

// 3. APROBAR O RECHAZAR SOLICITUD DESDE EL DASHBOARD DE RRHH + FIRMA CAMERCLOUD
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

    let signedPdfBase64Result: string | null = null;
    let signatureCodeResult: string | null = null;

    // Si la acción es APROBAR, generamos el PDF y lo firmamos con Camercloud
    if (status === 'APPROVED') {
      const permission = await prisma.permissionRequest.findUnique({
        where: { id: requestId },
        include: { user: true },
      });

      if (!permission) {
        return NextResponse.json({ error: 'Solicitud de permiso no encontrada.' }, { status: 404 });
      }

      // 1. Generar el PDF en memoria con la firma manuscrita/táctil incorporada
      const pdfBase64 = await generatePermissionPdfBase64({
        id: permission.id,
        userName: `${permission.user.name} ${permission.user.lastName}`,
        userDni: permission.user.dni,
        type: permission.type,
        reason: permission.reason,
        startDate: permission.startDate.toISOString(),
        endDate: permission.endDate.toISOString(),
        employeeSignatureBase64: permission.employeeSignature,
      });

      // 2. Firmar desatendidamente el PDF en Camercloud (PAdES-B)
      const { signedPdfBase64, signatureCode } = await CamercloudService.signPdfDocument(
        pdfBase64,
        `Papeleta_${permission.user.dni}_${permission.id}.pdf`
      );

      signedPdfBase64Result = `data:application/pdf;base64,${signedPdfBase64}`;
      signatureCodeResult = signatureCode;
    }

    // Update en Base de Datos con el PDF Firmado
    const updatedPermission = await prisma.permissionRequest.update({
      where: { id: requestId },
      data: {
        status,
        approvedBy: approvedBy || 'RRHH Administrator',
        ...(signedPdfBase64Result && { signedPdfBase64: signedPdfBase64Result }),
      },
      include: {
        user: { select: { id: true, name: true, lastName: true, dni: true } },
      },
    });

    // Registro de Auditoría ISO 27001 / SUNAFIL
    await prisma.auditLog.create({
      data: {
        performedById: updatedPermission.userId,
        entity: 'PERMISSION_REQUEST',
        entityId: requestId,
        action: `PERMISSION_${status}`,
        newValue: signatureCodeResult || undefined,
        reason: status === 'APPROVED'
          ? 'Permiso APROBADO y firmado digitalmente mediante Certificado Camercloud PAdES-B'
          : `Estado de permiso cambiado a ${status} por RRHH`,
      },
    });

    return NextResponse.json({
      success: true,
      permission: updatedPermission,
      signatureCode: signatureCodeResult,
    });
  } catch (error: any) {
    console.error('Error al actualizar y firmar permiso:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}