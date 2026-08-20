import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  const taina = users.filter(u => u.name.includes('Tain'));
  const otavio = users.filter(u => u.name.includes('Otav') || u.name.includes('Otáv'));
  
  console.log('Taina:', JSON.stringify(taina, null, 2));
  console.log('Otavio:', JSON.stringify(otavio, null, 2));
}

run().finally(() => prisma.$disconnect());
