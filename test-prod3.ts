import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const os = await prisma.ordemServico.findMany({
    where: { osNumber: "234825" },
    include: { client: true, device: true }
  });
  console.log("Count:", os.length);
  os.forEach(o => console.log(o.id, o.status, o.deletedAt));
}
run().finally(() => prisma.$disconnect());
