// src/app/api/v1/hr/permissions/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CamercloudService } from '@/lib/camercloud';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const identifier = resolvedParams.id;

    if (!identifier) {
      return NextResponse.json({ error: 'Identificador no válido' }, { status: 400 });
    }

    // Buscar en la base de datos por el ID del permiso
    const permission = await prisma.permissionRequest.findUnique({
      where: { id: identifier },
    });

    // Determinar el código de firma que entiende Camercloud
    const codeToDownload = permission?.signatureCode || identifier;

    if (!codeToDownload) {
      return NextResponse.json({ error: 'No se encontró un código de firma válido para este permiso' }, { status: 404 });
    }

    // Descargar el documento directamente desde Camercloud usando el signatureCode
    const pdfBuffer = await CamercloudService.downloadSignedDocument(codeToDownload);

    // Si los primeros bytes no contienen la cabecera PDF (%PDF), notificamos el error
    if (!pdfBuffer || pdfBuffer.length < 50 || !pdfBuffer.toString('utf-8', 0, 10).includes('%PDF')) {
      return NextResponse.json(
        { error: 'El archivo recuperado de Camercloud no es un PDF válido o venció en el servidor' },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Papeleta_Firmada_${identifier}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error al descargar documento:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener el PDF' }, { status: 500 });
  }
}