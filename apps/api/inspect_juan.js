const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'juan@deluxnet.mx' }
  });

  if (!user) {
    console.log('User juan@deluxnet.mx not found!');
    return;
  }

  console.log('Current Juan User:', {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    role: user.role
  });

  if (user.status !== 'ACTIVE') {
    console.log('Updating user status to ACTIVE...');
    const updated = await prisma.user.update({
      where: { email: 'juan@deluxnet.mx' },
      data: { status: 'ACTIVE' }
    });
    console.log('Updated user status:', updated.status);
  } else {
    console.log('User status is already ACTIVE.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
