import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        performedBy: { select: { name: true, lastName: true, dni: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Últimos 100 eventos de seguridad
    });
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}