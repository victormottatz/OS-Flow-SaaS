import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO SCRIPT DE DEDUPLICAÇÃO DE PEÇAS ===");
  
  // 1. Buscar todas as peças ativas
  const parts = await prisma.part.findMany({
    where: { deletedAt: null }
  });
  console.log(`Total de peças ativas no banco: ${parts.length}`);

  // 2. Agrupar peças pelo nome normalizado
  const nameGroups: { [key: string]: typeof parts } = {};
  parts.forEach(p => {
    // Normalização: caixa baixa, sem espaços sobressalentes e aparando pontas
    const normName = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!nameGroups[normName]) {
      nameGroups[normName] = [];
    }
    nameGroups[normName].push(p);
  });

  // Filtrar apenas grupos que possuem duplicatas reais (mais de 1 item)
  const duplicates = Object.entries(nameGroups).filter(([_, list]) => list.length > 1);
  console.log(`Encontrados ${duplicates.length} grupos de produtos duplicados logicamente.`);

  if (duplicates.length === 0) {
    console.log("Nenhuma duplicata encontrada para fundir. Finalizando.");
    await prisma.$disconnect();
    return;
  }

  // 3. Processar cada grupo de duplicatas
  for (const [normName, list] of duplicates) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processando grupo: "${normName}" (${list.length} itens)`);

    // Eleger a peça principal (Pai)
    // Regra:
    // 1. Preferir a que tem o código mais curto e limpo (ex: sem espaços, sem sufixos temporários como "-DUP").
    // 2. Preferir a que possui maior estoque.
    // 3. Se empatar, a com preço/custo maior.
    const sorted = [...list].sort((a, b) => {
      const cleanA = (a.code || "").trim();
      const cleanB = (b.code || "").trim();
      
      // Peso do código limpo (comprimento e caracteres especiais)
      if (cleanA.length !== cleanB.length) {
        return cleanA.length - cleanB.length; // Código menor tem prioridade
      }
      
      // Estoque maior tem prioridade
      if (b.stock !== a.stock) {
        return b.stock - a.stock;
      }

      // Preço maior tem prioridade
      return b.price - a.price;
    });

    const mainPart = sorted[0];
    const duplicateParts = sorted.slice(1);

    console.log(`✓ Peça principal eleita: ID ${mainPart.id} | Código: "${mainPart.code}" | Estoque: ${mainPart.stock} | Preço: R$ ${mainPart.price}`);
    console.log(`⚠ Peças duplicadas a serem mescladas e removidas:`);
    duplicateParts.forEach(d => {
      console.log(`  - ID ${d.id} | Código: "${d.code}" | Estoque: ${d.stock} | Preço: R$ ${d.price}`);
    });

    // Calcular estoque consolidado
    const totalStock = mainPart.stock + duplicateParts.reduce((sum, d) => sum + d.stock, 0);
    
    // Obter melhor preço e custo (se o principal for 0, mas a duplicata tiver valor real, pega a da duplicata)
    let bestPrice = mainPart.price;
    let bestCost = mainPart.cost;
    duplicateParts.forEach(d => {
      if (bestPrice === 0 && d.price > 0) bestPrice = d.price;
      if (bestCost === 0 && d.cost > 0) bestCost = d.cost;
    });

    console.log(`➡ Consolidado Final -> Estoque: ${totalStock} | Preço: R$ ${bestPrice} | Custo: R$ ${bestCost}`);

    // Executar a fusão em transação
    await prisma.$transaction(async (tx) => {
      // A. Atualizar a peça principal com o novo estoque e valores consolidados
      await tx.part.update({
        where: { id: mainPart.id },
        data: {
          stock: totalStock,
          price: bestPrice,
          cost: bestCost,
          code: mainPart.code.trim() // Aproveita para remover espaços das pontas
        }
      });

      // B. Atualizar o histórico de O.S. (usos da peça) para apontar para o ID principal
      const duplicateIds = duplicateParts.map(d => d.id);
      
      // Buscar ordens de serviço que usam as peças duplicadas
      const osList = await tx.ordemServico.findMany({
        where: { deletedAt: null }
      });

      let updatedOSCount = 0;

      for (const os of osList) {
        let partsList: any[] = typeof os.usedParts === "string" 
          ? JSON.parse(os.usedParts) 
          : (os.usedParts || []) as any[];

        if (!Array.isArray(partsList)) continue;

        let osModified = false;
        const newPartsList = partsList.map(item => {
          if (item && item.partId && duplicateIds.includes(item.partId)) {
            osModified = true;
            return {
              ...item,
              partId: mainPart.id, // Redireciona para o ID Pai
              name: mainPart.name  // Garante que o nome fique uniforme
            };
          }
          return item;
        });

        if (osModified) {
          // Salva a lista atualizada no banco
          await tx.ordemServico.update({
            where: { id: os.id },
            data: { usedParts: newPartsList as any }
          });
          updatedOSCount++;
        }
      }

      if (updatedOSCount > 0) {
        console.log(`  ✓ ${updatedOSCount} Ordens de Serviço foram atualizadas para apontar para a peça Pai.`);
      }

      // C. Marcar peças duplicadas como excluídas e renomear o código para liberar a constraint UNIQUE
      for (const dup of duplicateParts) {
        // Adiciona um timestamp para liberar o código original imediatamente no UNIQUE
        const renamedCode = `${dup.code.trim()}-MERGED-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        await tx.part.update({
          where: { id: dup.id },
          data: {
            code: renamedCode,
            deletedAt: new Date(),
            stock: 0 // Zera o estoque da duplicata para auditorias
          }
        });
      }
      console.log(`  ✓ Peças duplicadas desativadas e códigos liberados.`);
    });
  }

  console.log("\n=== FUSÃO E DEDUPLICAÇÃO CONCLUÍDAS COM SUCESSO! ===");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erro durante a execução:", err);
  await prisma.$disconnect();
});
