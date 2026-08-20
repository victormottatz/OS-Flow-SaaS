import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5433/postgres_teste?schema=public"
    }
  }
});
async function run() {
  const os = await prisma.ordemServico.findFirst({
    where: { osNumber: "234825" },
    include: { client: true, device: true }
  });
  console.log("OS in VPS DB:", os ? os.status : "NOT FOUND");
  const count = await prisma.ordemServico.count({where: {status: 'PRONTO_RETIRADA'}});
  console.log("Count PRONTO_RETIRADA in VPS DB:", count);
}
run().finally(() => prisma.$disconnect());
