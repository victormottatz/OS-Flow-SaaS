import { PrismaClient } from '@prisma/client';

async function checkTagsSchema() {
  const url = "postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5433/postgres_teste?schema=public";
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tags' AND column_name='scope';
    `);
    console.log("Resultado da verificação:", result);
  } catch (err: any) {
    console.error("Erro:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTagsSchema();
