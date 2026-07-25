import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando limpeza de registros temporários com sufixo '-SH'...");

  const deletedParts = await prisma.partUsage.deleteMany({
    where: {
      osLegacyId: {
        endsWith: "-SH",
      },
    },
  });
  console.log(`-> Deletadas ${deletedParts.count} peças vinculadas.`);

  const deletedServices = await prisma.serviceItem.deleteMany({
    where: {
      osLegacyId: {
        endsWith: "-SH",
      },
    },
  });
  console.log(`-> Deletados ${deletedServices.count} serviços vinculados.`);

  const deletedOrders = await prisma.ordemServico.deleteMany({
    where: {
      osNumber: {
        endsWith: "-SH",
      },
    },
  });
  console.log(`-> Deletadas ${deletedOrders.count} ordens de serviço.`);

  console.log("Limpeza concluída com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
