// Verifica o schema aplicado na homologação e contagens
// Uso: npx tsx src/scripts/check_homolog.mts
import pg from "pg";

const HOMOLOG_URL =
  process.env.HOMOLOG_URL || "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/mgv_homolog";

(async () => {
  const db = new pg.Client({ connectionString: HOMOLOG_URL });
  await db.connect();

  const cols = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='clients' ORDER BY ordinal_position`
  );
  console.log("Colunas de clients:", cols.rows.length, "|", cols.rows.map((r) => r.column_name).join(", "));

  const tables = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  console.log(`Total de tabelas na homologação: ${tables.rows.length}`);

  for (const t of tables.rows) {
    try {
      const r = await db.query(`SELECT count(*)::int as c FROM "${t.table_name}"`);
      if (r.rows[0].c > 0) console.log(`  ${t.table_name.padEnd(30)} ${r.rows[0].c}`);
    } catch { /* ignora */ }
  }

  await db.end();
})().catch((e) => {
  console.error("Erro:", String(e).slice(0, 500));
  process.exit(1);
});
