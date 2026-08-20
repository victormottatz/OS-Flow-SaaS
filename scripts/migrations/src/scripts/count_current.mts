// Contagem rápida de entidades no Supabase para validar a migração
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../../../.env") });
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });

const tables = ["clients", "devices", "ordem_servicos", "service_items", "part_usages", "payments", "parts"];
(async () => {
  try {
    for (const t of tables) {
      const r = await pool.query(`SELECT count(*)::int as c FROM "${t}"`);
      console.log(`${t.padEnd(20)} ${r.rows[0].c}`);
    }
  } catch (e) {
    console.error(String(e).slice(0, 300));
  } finally {
    await pool.end();
  }
})();
