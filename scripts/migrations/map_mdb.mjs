// Mapa compacto do banco legado Dados.MDB (SH Oficina)
// Uso: node scripts/migrations/map_mdb.mjs
import { default as Database } from "mdb-reader";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdbPath = join(__dirname, "..", "..", "Dados.MDB");
const buf = readFileSync(mdbPath);
const db = new Database(buf);

const tableNames = db.getTableNames();
const lines = [];

for (const name of tableNames) {
  try {
    const table = db.getTable(name);
    const columns = table.getColumnNames();
    const rows = table.getData();
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    lines.push(
      `| ${name} | ${rowCount} | ${columns.join(", ")} |`
    );
  } catch (err) {
    lines.push(`| ${name} | ERRO | ${String(err).slice(0, 80)} |`);
  }
}

console.log(`# Mapa do banco Dados.MDB — ${tableNames.length} tabelas\n`);
console.log(`| Tabela | Registros | Colunas |`);
console.log(`|---|---|---|`);
console.log(lines.join("\n"));
