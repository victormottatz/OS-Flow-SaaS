// Fase 2 — Aplica o DDL do schema dos módulos legados na homologação
// Uso: npx tsx src/scripts/apply_legacy_schema.mts
import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HOMOLOG_URL =
  process.env.HOMOLOG_URL || "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/mgv_homolog";

(async () => {
  const db = new pg.Client({ connectionString: HOMOLOG_URL });
  await db.connect();

  const raw = readFileSync(resolve(__dirname, "../../sql/legacy_schema.sql"), "utf-8");
  // Remove linhas de comentário (-- ...) para não quebrar a divisão de statements
  const sql = raw
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  // Divide por statements (CREATE TABLE/CREATE INDEX terminam em ";")
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let ok = 0;
  const errors: string[] = [];
  for (const stmt of statements) {
    try {
      await db.query(stmt);
      ok++;
    } catch (e) {
      errors.push(`${String(e).slice(0, 200)} | ${stmt.slice(0, 80)}`);
    }
  }

  console.log(`Statements executados: ${ok}/${statements.length}`);
  if (errors.length) {
    console.log("Erros:");
    for (const e of errors) console.log("  -", e);
  }

  // Lista tabelas criadas
  const res = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  console.log("Tabelas na homologação:", res.rows.map((r) => r.table_name).join(", "));

  await db.end();
})().catch((e) => {
  console.error("Erro:", String(e).slice(0, 500));
  process.exit(1);
});
