// src/app/api/v1/user/home-address/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, alias, lat, lng } = body;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Coordenadas GPS inválidas o no recibidas' },
        { status: 400 }
      );
    }

    // Buscar al usuario por ID o por DNI
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { dni: userId }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos' },
        { status: 404 }
      );
    }

    const newAddress = await prisma.homeAddress.create({
      data: {
        userId: user.id,
        alias: alias || 'Mi Casa',
        latitude,
        longitude,
      },
    });

    return NextResponse.json(
      { success: true, address: newAddress },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ ERROR AL GUARDAR DOMICILIO:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error?.message },
      { status: 500 }
    );
  }
}