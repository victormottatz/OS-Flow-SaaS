// Fase 2a — Cria as tabelas-base mínimas na homologação (o pipeline consulta
// clients/devices/ordem_servicos para carregar os mapeamentos de legacyId).
// Uso: npx tsx src/scripts/setup_base_homolog.mts
import pg from "pg";

const HOMOLOG_URL =
  process.env.HOMOLOG_URL || "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/mgv_homolog";

(async () => {
  const db = new pg.Client({ connectionString: HOMOLOG_URL });
  await db.connect();

  await db.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY,
      "legacyId" TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY,
      "legacyId" TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS ordem_servicos (
      id UUID PRIMARY KEY,
      "osNumber" TEXT
    );
  `);
  console.log("Tabelas-base mínimas criadas na homologação.");

  await db.end();
})().catch((e) => {
  console.error("Erro:", String(e).slice(0, 500));
  process.exit(1);
});
