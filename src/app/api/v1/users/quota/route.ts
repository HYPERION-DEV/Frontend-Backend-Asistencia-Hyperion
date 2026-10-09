// src/app/api/v1/users/quota/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const { userId, newQuota, adminId } = await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: { homeOfficeQuota: parseInt(newQuota) },
    });

    // Auditoría ISO 27001
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          performedById: adminId,
          entity: 'UserHomeOfficeQuota',
          entityId: userId,
          action: 'UPDATE_HOME_OFFICE_QUOTA',
          newValue: `Nueva cuota: ${newQuota} días`,
          reason: 'Ajuste autorizado por RRHH',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cuota de Home Office actualizada a ${newQuota} días.`,
      user,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error actualizando cuota' }, { status: 500 });
  }
}