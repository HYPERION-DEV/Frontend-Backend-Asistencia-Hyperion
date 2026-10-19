// src/app/api/v1/hr/permissions/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePermissionPdfBase64 } from '@/lib/pdf-generator';
import { CamercloudService } from '@/lib/camercloud';

export async function POST(req: NextRequest) {
  try {
    const { permissionId } = await req.json();

    if (!permissionId || typeof permissionId !== 'string') {
      return NextResponse.json(
        { error: 'El parámetro permissionId es requerido.' },
        { status: 400 }
      );
    }

    const permission = await prisma.permissionRequest.findUnique({
      where: { id: permissionId.trim() },
      include: { user: true },
    });

    if (!permission) {
      return NextResponse.json({ error: 'Solicitud de permiso no encontrada.' }, { status: 404 });
    }

    // Generar el PDF
    const rawPdfBase64 = await generatePermissionPdfBase64({
      id: permission.id,
      userName: `${permission.user.name} ${permission.user.lastName}`,
      userDni: permission.user.dni,
      type: permission.type,
      reason: permission.reason,
      startDate: permission.startDate.toISOString(),
      endDate: permission.endDate.toISOString(),
      employeeSignatureBase64: permission.employeeSignature,
    });

    const cleanPdfBase64 = rawPdfBase64
      .replace(/^data:application\/pdf;base64,/, '')
      .replace(/[\r\n\t ]/g, '');

    const documentName = `Papeleta_${permission.user.dni.trim()}_${permission.id.trim()}.pdf`;

    // Solicitar y ejecutar firma en Camercloud
    const { signedPdfBase64, signatureCode } = await CamercloudService.signPdfDocument(
      cleanPdfBase64,
      documentName
    );

    // 👈 Guardar AMARRANDO el signatureCode al registro de la base de datos
    await prisma.permissionRequest.update({
      where: { id: permission.id },
      data: {
        status: 'APPROVED',
        signedPdfBase64: signedPdfBase64,
        signatureCode: signatureCode, // Se guarda el código de firma devuelto
      },
    });

    return NextResponse.json({
      success: true,
      signatureCode,
      signedPdfBase64: `data:application/pdf;base64,${signedPdfBase64}`,
    });
  } catch (error: any) {
    console.error('==== ERROR EN PROCESO DE FIRMA CAMERCLOUD ====');
    console.error(error.message || error);
    console.error('==============================================');

    return NextResponse.json(
      { error: error.message || 'Error durante el proceso de firma' },
      { status: 500 }
    );
  }
}