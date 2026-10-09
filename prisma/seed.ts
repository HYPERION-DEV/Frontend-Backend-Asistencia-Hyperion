// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Crear / Actualizar Empresa
  const company = await prisma.company.upsert({
    where: { ruc: '20608810987' },
    update: {},
    create: {
      name: 'Hyperion Digital Security S.A.C.',
      ruc: '20608810987',
      officeLat: -14.078775,
      officeLng: -75.751176,
      radiusM: 50.0,
      qrSecret: 'HYPERION_QR_SECRET_KEY_2026',
    },
  });

  // 2. Lista de 10 Empleados
  const empleados = [
    { dni: '70000001', name: 'Miguel Martin', lastName: 'Conde Garcia', jobTitle: 'Desarrollador Senior', role: Role.ADMIN },
    { dni: '70000002', name: 'Carlos', lastName: 'Mendoza Lopez', jobTitle: 'Analista de Sistemas', role: Role.EMPLOYEE },
    { dni: '70000003', name: 'Ana Maria', lastName: 'Torres Perez', jobTitle: 'Especialista de RRHH', role: Role.HR },
    { dni: '70000004', name: 'Juan Carlos', lastName: 'Rios Gomez', jobTitle: 'Soporte Técnico', role: Role.EMPLOYEE },
    { dni: '70000005', name: 'Lucia', lastName: 'Fernandez Silva', jobTitle: 'Diseñadora UX', role: Role.EMPLOYEE },
    { dni: '70000006', name: 'Roberto', lastName: 'Vargas Diaz', jobTitle: 'Supervisor de Seguridad', role: Role.EMPLOYEE },
    { dni: '70000007', name: 'Sofia', lastName: 'Castro Morales', jobTitle: 'Contadora', role: Role.EMPLOYEE },
    { dni: '70000008', name: 'Diego', lastName: 'Espinoza Paredes', jobTitle: 'Ingeniero de Redes', role: Role.EMPLOYEE },
    { dni: '70000009', name: 'Elena', lastName: 'Navarro Ruiz', jobTitle: 'Asistente Administrativo', role: Role.EMPLOYEE },
    { dni: '70000010', name: 'Fernando', lastName: 'Soto Medina', jobTitle: 'Gerente de Operaciones', role: Role.EMPLOYEE },
  ];

  for (const emp of empleados) {
    await prisma.user.upsert({
      where: { dni: emp.dni },
      update: {},
      create: {
        dni: emp.dni,
        name: emp.name,
        lastName: emp.lastName,
        email: `usuario_${emp.dni}@hyperion.pe`,
        passwordHash,
        role: emp.role,
        jobTitle: emp.jobTitle,
        workStartTime: '09:00',
        toleranceMinutes: 10,
        homeOfficeQuota: 4, // 4 días de Home Office por defecto
        baseSalary: 2500.0,
        companyId: company.id,
      },
    });
  }

  console.log('✅ Empresa y 10 usuarios sembrados correctamente. Contraseña por defecto: 123456');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());