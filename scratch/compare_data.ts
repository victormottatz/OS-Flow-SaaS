import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

async function compareDatabases() {
  console.log("Iniciando varredura e comparação de dados...");

  // 1. Conectando no banco PostgreSQL LOCAL (Porta 5432)
  const localUrl = "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres?schema=public";
  const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } });
  
  let localCounts = { users: 0, clients: 0, devices: 0, parts: 0, ordensServico: 0 };
  try {
    localCounts = {
      users: await prismaLocal.user.count(),
      clients: await prismaLocal.client.count(),
      devices: await prismaLocal.device.count(),
      parts: await prismaLocal.part.count(),
      ordensServico: await prismaLocal.ordemServico.count(),
    };
    console.log("✅ Banco LOCAL (PostgreSQL - localhost:5432) lido com sucesso.");
  } catch (e: any) {
    console.error("❌ Erro ao ler banco Postgres local:", e.message);
  } finally {
    await prismaLocal.$disconnect();
  }

  // 2. Conectando no banco PostgreSQL da VPS
  const vpsUrl = "postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5433/postgres_teste?schema=public";
  const prisma = new PrismaClient({ datasources: { db: { url: vpsUrl } } });

  console.log("\nConectando à VPS (PostgreSQL)...");
  
  try {
    const vpsCounts = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      devices: await prisma.device.count(),
      parts: await prisma.part.count(),
      ordensServico: await prisma.ordemServico.count(),
    };

    console.log("✅ Conectado à VPS com sucesso.\n");

    // 3. Exibindo o Relatório
    console.log("📊 RELATÓRIO DE COMPARAÇÃO (Local JSON vs VPS Postgres):");
    console.log("==========================================================");
    console.log(`Tabela            | Local (JSON) | VPS (Nuvem)  | Diferença `);
    console.log(`----------------------------------------------------------`);
    
    for (const key of Object.keys(localCounts) as (keyof typeof localCounts)[]) {
      const loc = localCounts[key];
      const vps = vpsCounts[key];
      const diff = vps - loc;
      const diffStr = diff > 0 ? `+${diff} (Nuvem maior)` : diff < 0 ? `${diff} (Faltam na Nuvem)` : `0 (Sincronizado)`;
      
      console.log(`${key.padEnd(17)} | ${String(loc).padEnd(12)} | ${String(vps).padEnd(12)} | ${diffStr}`);
    }
    console.log("==========================================================");

  } catch (err: any) {
    console.error("❌ Erro ao conectar na VPS:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareDatabases();
