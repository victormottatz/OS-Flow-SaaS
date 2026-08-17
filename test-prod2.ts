import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const os = await prisma.ordemServico.findFirst({
    where: { osNumber: "234825" },
    include: { client: true, device: true }
  });
  console.log(JSON.stringify(os, null, 2));
}
run().finally(() => prisma.$disconnect());
