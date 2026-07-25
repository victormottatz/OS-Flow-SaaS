import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando remoção do prefixo 'OS-' de todos os números de OS e referências...");

  // Busca todas as OSs com o prefixo
  const orders = await prisma.ordemServico.findMany({
    where: {
      osNumber: {
        startsWith: "OS-",
      },
    },
  });

  console.log(`Encontradas ${orders.length} OSs com o prefixo 'OS-'.`);

  let updatedCount = 0;

  for (const os of orders) {
    const cleanNumber = os.osNumber.replace("OS-", "").trim();

    // Verifica se já existe outra OS com esse número limpo
    const exists = await prisma.ordemServico.findUnique({
      where: {
        osNumber: cleanNumber,
      },
    });

    if (exists) {
      console.warn(`[CONFLITO] Não é possível remover o prefixo de '${os.osNumber}' pois '${cleanNumber}' já existe.`);
      continue;
    }

    try {
      // 1. Atualiza peças vinculadas
      await prisma.partUsage.updateMany({
        where: {
          osLegacyId: os.osNumber,
        },
        data: {
          osLegacyId: cleanNumber,
        },
      });

      // 2. Atualiza serviços vinculados
      await prisma.serviceItem.updateMany({
        where: {
          osLegacyId: os.osNumber,
        },
        data: {
          osLegacyId: cleanNumber,
        },
      });

      // 3. Atualiza a OS em si
      await prisma.ordemServico.update({
        where: {
          id: os.id,
        },
        data: {
          osNumber: cleanNumber,
        },
      });

      updatedCount++;
    } catch (err: any) {
      console.error(`Erro ao atualizar OS ${os.osNumber}:`, err.message);
    }
  }

  console.log(`-> Concluído. ${updatedCount} OSs foram atualizadas com sucesso para formato puramente numérico.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
