import { default as Database } from "mdb-reader";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdbPath = join(__dirname, "..", "..", "Dados1.mdb");

const buf = readFileSync(mdbPath);
const db = new Database(buf);

const output = [];

// The main stock table in SH Oficina is "ITENS"
const targetTables = ["ITENS", "ITENS_ENTRADA", "ITENS_SAIDA", "ITENS_SERIAL", "ITENS_FABRICA", "NOTAS_COMPRAS_ITENS", "NOTAS_COMPRAS"];

for (const name of targetTables) {
  try {
    const table = db.getTable(name);
    const columns = table.getColumnNames();
    const rows = table.getData();
    
    output.push(`\n${"=".repeat(60)}`);
    output.push(`TABLE: ${name} (${rows.length} rows, ${columns.length} columns)`);
    output.push(`${"=".repeat(60)}`);
    output.push(`ALL COLUMNS:\n  ${columns.join("\n  ")}`);
    
    // Show 2 sample rows
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      output.push(`\n  --- Row ${i + 1} ---`);
      for (const col of columns) {
        output.push(`    ${col}: (${typeof rows[i][col]}) = ${JSON.stringify(rows[i][col])}`);
      }
    }
  } catch (e) {
    output.push(`\nTABLE: ${name} - ERROR: ${e.message}`);
  }
}

const report = output.join("\n");
writeFileSync(join(__dirname, "mdb_itens_report.txt"), report, "utf-8");
console.log(report);
