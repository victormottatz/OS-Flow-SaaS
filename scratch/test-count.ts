import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const count = await prisma.ordemServico.count({where: {status: 'PRONTO_RETIRADA'}});
  console.log("Count PRONTO_RETIRADA:", count);

  const deletedCount = await prisma.ordemServico.count({where: {status: 'PRONTO_RETIRADA', deletedAt: {not: null}}});
  console.log("Deleted Count:", deletedCount);
}
run().finally(() => prisma.$disconnect());
