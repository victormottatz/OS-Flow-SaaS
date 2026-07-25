import { MdbReader } from "../readers/mdb-reader.js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
config({ path: resolve(dirname(__filename), "../../../../.env") });
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });

async function main() {
  try {
    // 1. MDB table names and counts
    const reader = new MdbReader({
      password: process.env.MDB_PASSWORD || ""
    });
    const mdbPath = process.env.MDB_LOCAL_PATH || resolve(dirname(__filename), "../../../../Dados.MDB");
    const mdbResult = await reader.read(mdbPath);
    
    console.log("=== TABELAS NO MDB ===");
    for (const t of mdbResult.tables) {
      console.log(`  ${(t.name as string).padEnd(20)} ${(t.rows as any[]).length} registros`);
    }

    // 2. PG row counts
    console.log("\n=== TABELAS NO SUPABASE ===");
    const pgTables = ["clients", "devices", "ordem_servicos", "service_items", "part_usages", "payments"];
    for (const t of pgTables) {
      const r = await pool.query(`SELECT count(*)::int as c FROM "${t}"`);
      console.log(`  ${t.padEnd(20)} ${r.rows[0].c}`);
    }

    // 3. Find missing clients (MDB legacyIds not in PG)
    console.log("\n=== CLIENTES FALTANTES (MDB - PG) ===");
    const mdbClients = mdbResult.tables.find((t: any) => t.name === "CLIENTES");
    if (mdbClients) {
      const mdbIds = new Set((mdbClients.rows as any[]).map((r: any) => r.CODIGO));
      const pgIdsR = await pool.query(`SELECT "legacyId" FROM clients WHERE "legacyId" IS NOT NULL`);
      const pgIds = new Set(pgIdsR.rows.map((r: any) => String(r.legacyId)));
      
      const missing = [...mdbIds].filter((id: any) => !pgIds.has(String(id))).sort((a: any, b: any) => a - b);
      console.log(`  MDB: ${mdbIds.size} clients, PG: ${pgIds.size} clients`);
      console.log(`  ${missing.length} faltando no PG:`);
      for (const id of missing.slice(0, 20)) {
        const row = (mdbClients.rows as any[]).find((r: any) => r.CODIGO === id);
        console.log(`    legacyId=${id}  nome="${row?.NOME ?? ''}"  fone="${row?.CELULAR ?? ''}"`);
      }
      if (missing.length > 20) console.log(`    ... e mais ${missing.length - 20}`);
    }

    // 4. Check for "[object Undefined]" in all tables
    console.log("\n=== VALORES INVALIDOS (object Undefined) ===");
    for (const t of pgTables) {
      const r = await pool.query(`
        SELECT count(*)::int as c FROM "${t}" WHERE 
          (SELECT string_agg(column_name, ',') FROM information_schema.columns WHERE table_name = '${t}' AND data_type = 'text') IS NOT NULL
          AND to_jsonb("${t}")::text LIKE '%[object Undefined]%'
      `);
      if (r.rows[0].c > 0) {
        console.log(`  ${t}: ${r.rows[0].c} registros com '[object Undefined]'`);
      }
    }

    // 5. Missing entryDate - check column name
    console.log("\n=== ORDEM_SERVICOS: datas ===");
    const dateCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'ordem_servicos' AND (column_name LIKE '%date%' OR column_name LIKE '%Date%')`);
    console.log("  Colunas de data:", dateCols.rows.map(r => r.column_name));
    for (const c of dateCols.rows) {
      const r = await pool.query(`SELECT count(*)::int as v FROM ordem_servicos WHERE "${c.column_name}" IS NOT NULL`);
      console.log(`  "${c.column_name}" preenchido: ${r.rows[0].v}/${4761}`);
    }

  } finally {
    await pool.end();
  }
}
main().catch(console.error);
