import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.$executeRawUnsafe(`SELECT pg_reload_conf()`);
  console.log("Config reloaded.");
}
run().finally(() => prisma.$disconnect());
