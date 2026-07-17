import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("🛠️ INICIANDO ROTINA DE ATUALIZAÇÃO RETROATIVA DE RECORRÊNCIA 🛠️");

  try {
    // 1. Buscar todas as OSs ativas ordenadas por data de criação
    const allOS = await prisma.ordemServico.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" }
    });

    console.log(`📋 Total de OSs ativas encontradas: ${allOS.length}`);

    let updatedCount = 0;

    // 2. Iterar por cada OS e aplicar a regra dos 90 dias
    for (const os of allOS) {
      const baseDate = os.createdAt;
      const ninetyDaysAgo = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Contar quantas OSs existiam no intervalo de 90 dias anteriores ou iguais para o mesmo dispositivo
      const periodOS = await prisma.ordemServico.findMany({
        where: {
          deviceId: os.deviceId,
          deletedAt: null,
          createdAt: {
            gte: ninetyDaysAgo,
            lte: baseDate
          }
        }
      });

      // Se houver pelo menos 3 OSs no intervalo, o grupo é classificado como recorrente
      if (periodOS.length >= 3) {
        // Se a OS atual ainda não estiver marcada como recorrente, marcar no banco
        if (!os.recurrent) {
          await prisma.ordemServico.update({
            where: { id: os.id },
            data: { recurrent: true }
          });
          updatedCount++;
        }
      }
    }

    console.log(`✅ Sucesso! Total de OSs atualizadas retroativamente para recorrentes: ${updatedCount}`);
  } catch (error: any) {
    console.error("❌ Ocorreu um erro na rotina:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
