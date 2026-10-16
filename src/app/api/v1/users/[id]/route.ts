// src/app/api/v1/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams?.id;

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario no recibido' }, { status: 400 });
    }

    const body = await req.json();
    const {
      jobTitle,
      workStartTime,
      toleranceMinutes,
      homeOfficeQuota,
      baseSalary,
      payrollPolicyId,
    } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        jobTitle,
        workStartTime,
        toleranceMinutes: Number(toleranceMinutes),
        homeOfficeQuota: Number(homeOfficeQuota),
        baseSalary: Number(baseSalary),
        payrollPolicyId: payrollPolicyId && String(payrollPolicyId).trim() !== '' ? payrollPolicyId : null,
      },
      include: {
        payrollPolicy: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Trabajador actualizado correctamente',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('❌ Error actualizando usuario:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}