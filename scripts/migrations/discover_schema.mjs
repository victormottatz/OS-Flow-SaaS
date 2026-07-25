import { default as Database } from "mdb-reader";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const mdbPath = join(__dirname, "..", "..", "Dados.MDB");
const buf = readFileSync(mdbPath);
const db = new Database(buf);

const tableNames = db.getTableNames();
console.log(`\nTotal tables: ${tableNames.length}\n`);
console.log("Tables:", tableNames.join(", "));
console.log("\n--- SCHEMA DETAILS ---\n");

for (const name of tableNames) {
  const table = db.getTable(name);
  const columns = table.getColumnNames();
  const rows = table.getData();
  const rowCount = Array.isArray(rows) ? rows.length : 0;

  console.log(`TABLE: ${name} (${rowCount} rows)`);
  console.log(`  Columns: ${columns.join(", ")}`);

  if (rowCount > 0 && Array.isArray(rows)) {
    const first = rows[0];
    for (const col of columns) {
      const val = first[col];
      console.log(`    ${col}: ${typeof val} = ${JSON.stringify(val)}`);
    }
  }
  console.log("");
}
