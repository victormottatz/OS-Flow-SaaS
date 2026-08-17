import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const os = await prisma.ordemServico.findFirst({
    where: { osNumber: "234825" }
  });
  console.log("Prod OS:", os ? os.status : "NOT FOUND");
  const count = await prisma.ordemServico.count({where: {status: 'PRONTO_RETIRADA'}});
  console.log("Count PRONTO_RETIRADA:", count);
}
run().finally(() => prisma.$disconnect());
