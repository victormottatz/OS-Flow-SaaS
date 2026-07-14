import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCounts() {
  const clients = await prisma.client.count();
  const parts = await prisma.part.count();
  const os = await prisma.ordemServico.count();
  const devices = await prisma.device.count();

  console.log('MGV Database Counts:');
  console.log('Clientes:', clients);
  console.log('Estoque (Peças):', parts);
  console.log('Total de OS:', os);
  console.log('Equipamentos:', devices);
}

checkCounts().finally(() => prisma.$disconnect());
