// src/app/api/v1/hr/policies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const db = prisma as any;
    const policies = await db.payrollPolicy.findMany({
      include: {
        company: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, policies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, daysInMonth, hoursPerDay, overtimeFirst2HoursRate, overtimeNextHoursRate, companyId } = body;

    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const defaultCompany = await prisma.company.findFirst();
      if (!defaultCompany) {
        return NextResponse.json({ error: 'No existe una empresa registrada en la BD' }, { status: 400 });
      }
      targetCompanyId = defaultCompany.id;
    }

    const db = prisma as any;
    const newPolicy = await db.payrollPolicy.create({
      data: {
        name,
        daysInMonth: Number(daysInMonth),
        hoursPerDay: Number(hoursPerDay),
        overtimeFirst2HoursRate: Number(overtimeFirst2HoursRate),
        overtimeNextHoursRate: Number(overtimeNextHoursRate),
        companyId: targetCompanyId,
      },
    });

    return NextResponse.json({ success: true, policy: newPolicy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}