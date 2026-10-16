// src/app/api/v1/hr/policies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const policyId = resolvedParams?.id;
    if (!policyId) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

    const body = await req.json();
    const { name, daysInMonth, hoursPerDay, overtimeFirst2HoursRate, overtimeNextHoursRate } = body;

    const updatedPolicy = await prisma.payrollPolicy.update({
      where: { id: policyId },
      data: {
        name,
        daysInMonth: Number(daysInMonth),
        hoursPerDay: Number(hoursPerDay),
        overtimeFirst2HoursRate: Number(overtimeFirst2HoursRate),
        overtimeNextHoursRate: Number(overtimeNextHoursRate),
      },
    });

    return NextResponse.json({ success: true, policy: updatedPolicy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}