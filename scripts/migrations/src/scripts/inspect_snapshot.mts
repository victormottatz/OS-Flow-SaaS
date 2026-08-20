// Inspeção de amostras do snapshot para calibrar o dicionário de mapeamento
// Uso: npx tsx src/scripts/inspect_snapshot.mts [tabela1,tabela2,...]
import { SnapshotService } from "../services/snapshot-service.js";
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const filter = args[0] ? args[0].split(",") : null;

(async () => {
  const dir = resolve(__dirname, "../../.snapshots");
  const file = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().pop();
  if (!file) throw new Error("Nenhum snapshot encontrado");
  const svc = new SnapshotService();
  const snap = await svc.load(resolve(dir, file));
  console.log(`Snapshot: ${file}\n`);

  for (const t of snap.tables) {
    if (filter && !filter.includes(t.name)) continue;
    console.log(`===== ${t.name} (${t.statistics.rowCount} rows) =====`);
    if (t.rows.length > 0) {
      const r = t.rows[0];
      for (const [k, v] of Object.entries(r)) {
        console.log(`  ${k}: ${typeof v} = ${JSON.stringify(v)}`);
      }
      if (t.rows.length > 1) {
        const r2 = t.rows[t.rows.length - 1];
        console.log("  --- último registro ---");
        for (const [k, v] of Object.entries(r2)) {
          console.log(`  ${k}: ${typeof v} = ${JSON.stringify(v)}`);
        }
      }
    }
    console.log("");
  }
})().catch((e) => {
  console.error("Erro:", String(e).slice(0, 600));
  process.exit(1);
});
