import { default as Database } from "mdb-reader";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdbPath = join(__dirname, "..", "..", "Dados1.mdb");

const buf = readFileSync(mdbPath);
const db = new Database(buf);

const tableNames = db.getTableNames();
const output = [];

output.push(`Total tables: ${tableNames.length}`);
output.push(`Tables: ${tableNames.join(", ")}`);

// Detailed dump of ESTOQUE / PECAS / PRODUTOS tables
const targetTables = tableNames.filter(n => {
  const u = n.toUpperCase();
  return u.includes("ESTOQUE") || u.includes("PECA") || u.includes("PRODUTO") || u.includes("MATERIAL") || u.includes("PEDIDO");
});

output.push(`\n\n=== TABELAS DE ESTOQUE/PEÇAS/PRODUTOS ENCONTRADAS: ${targetTables.join(", ")} ===\n`);

for (const name of targetTables) {
  const table = db.getTable(name);
  const columns = table.getColumnNames();
  const rows = table.getData();
  
  output.push(`\n========================================`);
  output.push(`TABLE: ${name} (${rows.length} rows, ${columns.length} columns)`);
  output.push(`========================================`);
  output.push(`ALL COLUMNS: ${columns.join(", ")}`);
  
  // Show 2 sample rows
  for (let i = 0; i < Math.min(2, rows.length); i++) {
    output.push(`\n  --- Row ${i + 1} ---`);
    for (const col of columns) {
      output.push(`    ${col}: (${typeof rows[i][col]}) = ${JSON.stringify(rows[i][col])}`);
    }
  }
}

// Also look at REGRAFISCAL and ICMS tables
const fiscalTables = tableNames.filter(n => {
  const u = n.toUpperCase();
  return u.includes("REGRA") || u.includes("ICMS") || u.includes("TRIBUT") || u.includes("FISCAL") || u.includes("NCM") || u.includes("CEST");
});

output.push(`\n\n=== TABELAS FISCAIS/TRIBUTÁRIAS: ${fiscalTables.join(", ")} ===\n`);

for (const name of fiscalTables) {
  const table = db.getTable(name);
  const columns = table.getColumnNames();
  const rows = table.getData();
  
  output.push(`TABLE: ${name} (${rows.length} rows, ${columns.length} columns)`);
  output.push(`  COLUMNS: ${columns.join(", ")}`);
  
  if (rows.length > 0) {
    output.push(`  Sample Row 1:`);
    for (const col of columns) {
      output.push(`    ${col} = ${JSON.stringify(rows[0][col])}`);
    }
  }
  output.push("");
}

const report = output.join("\n");
writeFileSync(join(__dirname, "mdb_estoque_report.txt"), report, "utf-8");
console.log(report);
