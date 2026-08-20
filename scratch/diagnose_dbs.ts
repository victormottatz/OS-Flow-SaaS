import { PrismaClient } from '@prisma/client';

async function testConnection(url: string, name: string) {
  console.log(`\n=== Testando Banco: ${name} ===`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const userCount = await prisma.user.count();
    const clientCount = await prisma.client.count();
    const osCount = await prisma.ordemServico.count();
    console.log(`[SUCESSO] Conectado a ${name}`);
    console.log(`- Usuários: ${userCount}`);
    console.log(`- Clientes: ${clientCount}`);
    console.log(`- Ordens de Serviço: ${osCount}`);
  } catch (err: any) {
    console.error(`[ERRO] Falha ao conectar em ${name}:`, err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const dbs = [
    {
      name: "Localhost (Porta 5432)",
      url: "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres_teste?schema=public"
    },
    {
      name: "mgv-postgres (Porta 5432 - Coolify)",
      url: "postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5432/postgres_teste?schema=public"
    },
    {
      name: "mgv-postgres-v2 (Porta 5433 - Coolify)",
      url: "postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5433/postgres_teste?schema=public"
    }
  ];

  for (const db of dbs) {
    await testConnection(db.url, db.name);
  }
}

main().catch(console.error);
