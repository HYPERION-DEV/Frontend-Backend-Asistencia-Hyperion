// src/app/api/v1/users/home-address/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, alias, lat, lng, addressReference, address } = body;

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!userId || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Parámetros incompletos o coordenadas GPS inválidas.' },
        { status: 400 }
      );
    }

    // 1. Buscar el usuario por UUID o por DNI
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: String(userId) },
          { dni: String(userId) }
        ]
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos' },
        { status: 404 }
      );
    }

    const addressText = addressReference || address || null;

    // 2. Verificar si ya existe una dirección con el mismo alias para el usuario
    const existingAddress = await prisma.homeAddress.findFirst({
      where: {
        userId: user.id,
        alias: alias || 'Casa Principal',
      },
    });

    let homeAddress;

    if (existingAddress) {
      // Actualizar registro existente ajustado exactamente al schema.prisma
      homeAddress = await prisma.homeAddress.update({
        where: { id: existingAddress.id },
        data: {
          latitude,
          longitude,
          address: addressText,
        },
      });
    } else {
      // Crear nuevo registro en HomeAddress
      homeAddress = await prisma.homeAddress.create({
        data: {
          userId: user.id,
          alias: alias || 'Casa Principal',
          latitude,
          longitude,
          address: addressText,
          isPrimary: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: '¡Domicilio registrado correctamente para Home Office!',
      homeAddress,
    });

  } catch (error: any) {
    console.error('❌ Error registrando domicilio Home Office:', error);
    return NextResponse.json(
      { 
        error: 'Error al registrar el domicilio en la base de datos', 
        details: error?.message || String(error) 
      },
      { status: 500 }
    );
  }
}