// Seed script for production database
// Run with: node prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  const passwordHash = await argon2.hash('S3cur3P@ssw0rd!');

  // Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deluxnet.com' },
    update: { passwordHash, status: 'ACTIVE', failedAttempts: 0 },
    create: {
      name: 'Super Admin',
      email: 'admin@deluxnet.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Collector
  const collector = await prisma.user.upsert({
    where: { email: 'juan@deluxnet.mx' },
    update: { passwordHash, status: 'ACTIVE', failedAttempts: 0 },
    create: {
      name: 'Juan Cobrador',
      email: 'juan@deluxnet.mx',
      passwordHash,
      role: 'COLLECTOR',
      status: 'ACTIVE',
    },
  });

  await prisma.collectorProfile.upsert({
    where: { userId: collector.id },
    update: {},
    create: {
      userId: collector.id,
      assignedZone: 'Zona Norte',
      cashLimit: 5000,
      canRegisterOfflinePayments: true,
      active: true,
    },
  });
  console.log(`✅ Collector: ${collector.email}`);

  // Demo customers
  const customers = [
    {
      firstName: 'María',
      lastName: 'López',
      phone: '5551234567',
      email: 'maria@example.com',
      addressLine: 'Calle Principal 123',
      locality: 'Centro',
      municipality: 'Guadalajara',
      currentBalance: 450.00,
      signupDate: new Date('2024-01-15'),
      billingCutoffDay: 15,
      status: 'MOROSO',
    },
    {
      firstName: 'Carlos',
      lastName: 'Ramírez',
      phone: '5559876543',
      email: 'carlos@example.com',
      addressLine: 'Av. Reforma 456',
      locality: 'Norte',
      municipality: 'Guadalajara',
      currentBalance: 350.00,
      signupDate: new Date('2024-02-20'),
      billingCutoffDay: 20,
      status: 'SUSPENDIDO',
    },
    {
      firstName: 'Ana',
      lastName: 'García',
      phone: '5554567890',
      email: 'ana@example.com',
      addressLine: 'Blvd. Independencia 789',
      locality: 'Sur',
      municipality: 'Guadalajara',
      currentBalance: 0,
      signupDate: new Date('2024-03-10'),
      billingCutoffDay: 10,
      status: 'ACTIVO',
    },
    {
      firstName: 'Pedro',
      lastName: 'Hernández',
      phone: '5552345678',
      email: 'pedro@example.com',
      addressLine: 'Calle Juárez 321',
      locality: 'Oriente',
      municipality: 'Zapopan',
      currentBalance: 700.00,
      signupDate: new Date('2024-01-05'),
      billingCutoffDay: 5,
      status: 'MOROSO',
    },
    {
      firstName: 'Lupita',
      lastName: 'Martínez',
      phone: '5556789012',
      email: 'lupita@example.com',
      addressLine: 'Priv. Las Flores 15',
      locality: 'Poniente',
      municipality: 'Tlaquepaque',
      currentBalance: 150.00,
      signupDate: new Date('2024-04-01'),
      billingCutoffDay: 1,
      status: 'ACTIVO',
    },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({
      where: { email: c.email },
    });
    if (!existing) {
      await prisma.customer.create({ data: c });
      console.log(`✅ Customer: ${c.firstName} ${c.lastName}`);
    } else {
      console.log(`⏩ Customer already exists: ${c.firstName} ${c.lastName}`);
    }
  }

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
