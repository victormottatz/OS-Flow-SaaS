// Fase 0 — Cria o banco de homologação mgv_homolog no PostgreSQL local
// Uso: npx tsx src/scripts/setup_homolog.mts
import pg from "pg";

const ADMIN_URL = process.env.HOMOLOG_ADMIN_URL || "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres";
const HOMOLOG_DB = "mgv_homolog";
const HOMOLOG_URL = process.env.HOMOLOG_URL || `postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/${HOMOLOG_DB}`;

(async () => {
  // 1. Conecta no banco admin e cria o banco de homologação
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const res = await admin.query("SELECT 1 AS ok");
  console.log("Conexão com PostgreSQL local OK:", res.rows[0].ok === 1 ? "sim" : "não");

  const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [HOMOLOG_DB]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${HOMOLOG_DB}"`);
    console.log(`Banco "${HOMOLOG_DB}" criado.`);
  } else {
    console.log(`Banco "${HOMOLOG_DB}" já existe.`);
  }
  await admin.end();

  // 2. Valida conexão direta no banco de homologação
  const hom = new pg.Client({ connectionString: HOMOLOG_URL });
  await hom.connect();
  await hom.end();
  console.log(`Conexão com ${HOMOLOG_DB} OK.`);
  console.log("HOMOLOG_URL=" + HOMOLOG_URL);
})().catch((e) => {
  console.error("Erro:", String(e).slice(0, 500));
  process.exit(1);
});
