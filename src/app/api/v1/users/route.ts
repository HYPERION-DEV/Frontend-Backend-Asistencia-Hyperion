// src/app/api/v1/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 1. OBTENER LISTA DE TRABAJADORES (Soluciona el error GET 405)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        dni: true,
        name: true,
        lastName: true,
        email: true,
        jobTitle: true,
        workStartTime: true,
        toleranceMinutes: true,
        homeOfficeQuota: true,
        overtimeRate: true,
        baseSalary: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error al consultar la lista de usuarios' },
      { status: 500 }
    );
  }
}

// 2. REGISTRAR UN NUEVO TRABAJADOR
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dni,
      name,
      lastName,
      email,
      jobTitle,
      workStartTime,
      toleranceMinutes,
      homeOfficeQuota,
      overtimeRate,
      baseSalary,
    } = body;

    // Verificar si el DNI o Email ya existen
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ dni }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El DNI o el correo electrónico ya se encuentra registrado.' },
        { status: 400 }
      );
    }

    // Obtener el ID de la primera empresa disponible en la base de datos
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json(
        { error: 'No existe una empresa registrada en la base de datos.' },
        { status: 400 }
      );
    }

    // Hash de la contraseña inicial por defecto ("123456")
    const passwordHash = await bcrypt.hash('123456', 10);

    const newUser = await prisma.user.create({
      data: {
        dni,
        name,
        lastName,
        email,
        passwordHash,
        jobTitle: jobTitle || 'Empleado',
        workStartTime: workStartTime || '09:00',
        toleranceMinutes: parseInt(toleranceMinutes) || 10,
        homeOfficeQuota: parseInt(homeOfficeQuota) || 4,
        overtimeRate: parseFloat(overtimeRate) || 1.25,
        baseSalary: parseFloat(baseSalary) || 0.0,
        companyId: company.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Trabajador registrado con éxito. Contraseña inicial: 123456',
      user: newUser,
    });
  } catch (error: any) {
    console.error('Error registrando trabajador:', error);
    return NextResponse.json(
      { error: 'Error al guardar el nuevo trabajador', details: error.message },
      { status: 500 }
    );
  }
}