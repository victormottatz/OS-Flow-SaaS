import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfill() {
  console.log("Iniciando backfill resiliente de peças e serviços do MDB para as OSs...");
  
  // 1. Carrega todas as peças e serviços de uma vez em memória para evitar N+1 queries
  console.log("-> Carregando peças (part_usages) do banco...");
  const allParts = await prisma.partUsage.findMany();
  console.log(`-> Carregadas ${allParts.length} peças.`);

  console.log("-> Carregando serviços (service_items) do banco...");
  const allServices = await prisma.serviceItem.findMany();
  console.log(`-> Carregados ${allServices.length} serviços.`);

  // 2. Agrupa em memória por osLegacyId
  const partsByOs = new Map<string, typeof allParts>();
  for (const part of allParts) {
    if (!part.osLegacyId) continue;
    const key = part.osLegacyId.trim();
    if (!partsByOs.has(key)) {
      partsByOs.set(key, []);
    }
    partsByOs.get(key)!.push(part);
  }

  const servicesByOs = new Map<string, typeof allServices>();
  for (const service of allServices) {
    if (!service.osLegacyId) continue;
    const key = service.osLegacyId.trim();
    if (!servicesByOs.has(key)) {
      servicesByOs.set(key, []);
    }
    servicesByOs.get(key)!.push(service);
  }

  // 3. Carrega todas as OSs
  console.log("-> Carregando ordens de serviço...");
  const orders = await prisma.ordemServico.findMany({
    where: {
      deletedAt: null
    },
    select: {
      id: true,
      osNumber: true
    }
  });
  console.log(`-> Encontradas ${orders.length} ordens de serviço.`);

  let updatedCount = 0;
  let errorCount = 0;

  // 4. Processa cada OS usando os dados em memória
  for (const os of orders) {
    if (!os.osNumber) continue;
    const osKey = os.osNumber.trim();

    const parts = partsByOs.get(osKey) || [];
    const services = servicesByOs.get(osKey) || [];

    if (parts.length === 0 && services.length === 0) {
      continue;
    }

    try {
      const usedPartsList: any[] = [];

      // Mapeia peças
      for (const part of parts) {
        const price = parseFloat(part.value || "0");
        const cost = parseFloat(part.cost || "0");
        usedPartsList.push({
          id: part.id,
          name: part.description || "Peça importada",
          quantity: part.quantity || 1,
          price: price,
          costSnapshot: cost,
          isAvulso: true,
          category: "PECA",
          serialNumber: part.serialInfo || undefined
        });
      }

      // Mapeia serviços e soma a mão de obra
      let computedLaborCost = 0;
      for (const service of services) {
        const total = parseFloat(service.total || "0");
        const cost = parseFloat(service.cost || "0");
        const qty = parseFloat(service.quantity || "1");
        
        computedLaborCost += total;

        usedPartsList.push({
          id: service.id,
          name: service.description || "Serviço importado",
          quantity: qty,
          price: qty > 0 ? (total / qty) : total,
          costSnapshot: cost,
          isAvulso: true,
          category: "SERVICO"
        });
      }

      const computedPartsCost = parts.reduce((sum, p) => sum + (parseFloat(p.value || "0") * (p.quantity || 1)), 0);
      const computedTotalCost = computedPartsCost + computedLaborCost;

      // Executa o update com try/catch isolado para não derrubar o script em caso de falha de validação ou erro pontual
      await prisma.ordemServico.update({
        where: { id: os.id },
        data: {
          usedParts: usedPartsList as any,
          partsCost: computedPartsCost,
          laborCost: computedLaborCost,
          totalCost: computedTotalCost
        }
      });

      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`  -> OSs sincronizadas e salvas com sucesso: ${updatedCount}...`);
      }
    } catch (err) {
      errorCount++;
      console.error(`[ERRO OS ${os.osNumber}] Falha ao processar backfill:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`\n=== Relatório Final de Backfill ===`);
  console.log(`Total de OSs atualizadas no banco: ${updatedCount}`);
  console.log(`Total de erros de gravação: ${errorCount}`);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith("backfill_parts_services.ts") || 
  process.argv[1].endsWith("backfill_parts_services.js")
);

if (isMain) {
  backfill()
    .catch((err) => {
      console.error("Erro fatal no script de backfill:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { backfill };
