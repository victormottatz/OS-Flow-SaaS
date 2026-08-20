import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Conectando ao banco de dados...");
  
  // Buscar todas as peças no banco
  const parts = await prisma.part.findMany({
    where: { deletedAt: null }
  });

  console.log(`Total de peças ativas no banco: ${parts.length}`);

  // 1. Procurar por códigos duplicados (ignorando maiúsculas/minúsculas e espaços)
  const codeMap: { [key: string]: any[] } = {};
  const nameMap: { [key: string]: any[] } = {};
  const duplicatesByNormalizedCode: any[] = [];
  const duplicatesByName: any[] = [];

  parts.forEach(p => {
    const normCode = (p.code || "").trim().toLowerCase();
    const normName = (p.name || "").trim().toLowerCase();

    if (normCode) {
      if (!codeMap[normCode]) codeMap[normCode] = [];
      codeMap[normCode].push(p);
    }

    if (normName) {
      if (!nameMap[normName]) nameMap[normName] = [];
      nameMap[normName].push(p);
    }
  });

  // Analisar duplicados por código
  for (const [code, list] of Object.entries(codeMap)) {
    if (list.length > 1) {
      duplicatesByNormalizedCode.push({ 
        code, 
        count: list.length, 
        items: list.map(item => ({ id: item.id, code: item.code, name: item.name, stock: item.stock, price: item.price })) 
      });
    }
  }

  // Analisar duplicados por nome
  for (const [name, list] of Object.entries(nameMap)) {
    if (list.length > 1) {
      duplicatesByName.push({ 
        name, 
        count: list.length, 
        items: list.map(item => ({ id: item.id, code: item.code, name: item.name, stock: item.stock, price: item.price })) 
      });
    }
  }

  console.log(`\n=== 🔎 DUPLICATAS POR CÓDIGO NORMALIZADO (Total: ${duplicatesByNormalizedCode.length}) ===`);
  duplicatesByNormalizedCode.slice(0, 15).forEach(dup => {
    console.log(`Código: "${dup.code}" (Aparece ${dup.count} vezes)`);
    dup.items.forEach((item: any) => {
      console.log(`  - ID: ${item.id} | Código Original: "${item.code}" | Nome: "${item.name}" | Estoque: ${item.stock} | Preço: ${item.price}`);
    });
  });

  console.log(`\n=== 🔎 DUPLICATAS POR NOME EXATO/NORMALIZADO (Total: ${duplicatesByName.length}) ===`);
  duplicatesByName.slice(0, 15).forEach(dup => {
    console.log(`Nome: "${dup.name}" (Aparece ${dup.count} vezes)`);
    dup.items.forEach((item: any) => {
      console.log(`  - ID: ${item.id} | Código: "${item.code}" | Estoque: ${item.stock} | Preço: ${item.price}`);
    });
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
