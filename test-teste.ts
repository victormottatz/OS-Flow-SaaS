import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const os = await prisma.ordemServico.findFirst({
    where: { osNumber: "234825" },
    include: { client: true, device: true }
  });
  console.log("OS in TESTE:", os ? os.status : "NOT FOUND");
}
run().finally(() => prisma.$disconnect());
