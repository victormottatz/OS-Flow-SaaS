import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando limpeza de OSs importadas do SH Oficina no dia 22/07/2026...");

  // Busca OSs criadas na data da migração
  const orders = await prisma.ordemServico.findMany({
    where: {
      createdAt: {
        gte: new Date("2026-07-22T00:00:00.000Z"),
        lt: new Date("2026-07-23T00:00:00.000Z"),
      },
    },
  });

  // Filtra apenas as OSs importadas do SH Oficina (que não começam com "OS-")
  const importedOrders = orders.filter((o) => !o.osNumber.startsWith("OS-"));
  const importedOsNumbers = importedOrders.map((o) => o.osNumber);

  console.log(`Encontradas ${importedOrders.length} OSs importadas para deletar:`, importedOsNumbers);

  if (importedOsNumbers.length > 0) {
    const deletedParts = await prisma.partUsage.deleteMany({
      where: {
        osLegacyId: {
          in: importedOsNumbers,
        },
      },
    });
    console.log(`-> Deletadas ${deletedParts.count} peças vinculadas.`);

    const deletedServices = await prisma.serviceItem.deleteMany({
      where: {
        osLegacyId: {
          in: importedOsNumbers,
        },
      },
    });
    console.log(`-> Deletados ${deletedServices.count} serviços vinculados.`);

    const deletedOrders = await prisma.ordemServico.deleteMany({
      where: {
        osNumber: {
          in: importedOsNumbers,
        },
      },
    });
    console.log(`-> Deletadas ${deletedOrders.count} ordens de serviço.`);
  }

  console.log("Limpeza concluída com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
