import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
  console.log('USERS:', users);
}

main().finally(async () => {
  await prisma.$disconnect();
});
