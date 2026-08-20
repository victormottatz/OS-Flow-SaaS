const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash('mgv123', 10);
  await prisma.user.create({
    data: {
      name: 'Victor Hugo',
      email: 'victor.hugo@mgvrp.com.br',
      passwordHash: hash,
      role: 'OWNER',
      permissions: ['os.view', 'os.create', 'os.edit', 'os.change_status', 'os.finish', 'os.stress_test', 'parts.view', 'parts.manage', 'clients.view', 'clients.manage', 'devices.notes', 'financial.view', 'bling.view', 'bling.sync', 'whatsapp.send', 'users.view', 'users.manage']
    }
  });
  console.log('User created!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
