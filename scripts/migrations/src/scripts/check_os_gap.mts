import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { SnapshotService } from "../services/snapshot-service.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });
const PROD_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
const HOMOLOG_URL = process.env.HOMOLOG_URL || "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/mgv_homolog";

async function main() {
  const snapDir = resolve(__dirname, "../../.snapshots");
  const file = readdirSync(snapDir).filter(f => f.endsWith(".json")).sort().pop()!;
  const svc = new SnapshotService();
  const snap = await svc.load(resolve(snapDir, file));
  const osRows = snap.tables.find(t => t.name === "ORDEMS")!.rows;
  const mdbNumbers = new Set(osRows.map(r => String(r.CODIGO)));
  console.log(`MDB ORDEMS: ${mdbNumbers.size} números únicos de ${osRows.length} linhas`);

  const prod = new pg.Pool({ connectionString: PROD_URL });
  const hom = new pg.Pool({ connectionString: HOMOLOG_URL });
  const [p, h] = await Promise.all([
    prod.query(`SELECT "osNumber" FROM ordem_servicos WHERE "osNumber" IS NOT NULL`),
    hom.query(`SELECT "osNumber" FROM ordem_servicos WHERE "osNumber" IS NOT NULL`),
  ]);
  const prodSet = new Set(p.rows.map(r => String(r.osNumber)));
  const homSet = new Set(h.rows.map(r => String(r.osNumber)));
  console.log(`PRODUÇÃO: ${prodSet.size} OS | HOMOLOGAÇÃO: ${homSet.size} OS`);
  const notInProd = [...mdbNumbers].filter(n => !prodSet.has(n));
  const notInHom = [...mdbNumbers].filter(n => !homSet.has(n));
  console.log(`MDB não existem na PRODUÇÃO: ${notInProd.length} → ${notInProd.slice(0,10).join(", ")}`);
  console.log(`MDB não existem na HOMOLOGAÇÃO: ${notInHom.length} → ${notInHom.slice(0,10).join(", ")}`);
  const dupHom = [...homSet].filter(n => !mdbNumbers.has(n));
  console.log(`HOMOLOGAÇÃO que não existem no MDB: ${dupHom.length} (criadas pós-migração? amostra: ${dupHom.slice(0,5).join(", ")})`);
  await prod.end(); await hom.end();
}
main().catch(e => { console.error(String(e).slice(0,600)); process.exit(1); });
