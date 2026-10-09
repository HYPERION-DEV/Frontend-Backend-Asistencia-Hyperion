// src/app/api/v1/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { dni, password } = await req.json();

    if (!dni || !password) {
      return NextResponse.json(
        { error: 'Debe ingresar DNI y contraseña' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { dni },
      include: { company: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'El DNI ingresado no está registrado en el sistema' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        dni: user.dni,
        name: `${user.name} ${user.lastName}`,
        jobTitle: user.jobTitle,
        companyName: user.company.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error en el servidor al autenticar' },
      { status: 500 }
    );
  }
}