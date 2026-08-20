// Fase 1 — Extração completa do Dados.MDB (97 tabelas) para snapshot versionado
// Uso: npx tsx src/scripts/run_extract.mts [--mdb <caminho>] [--out <dir>]
import { MdbReader } from "../readers/mdb-reader.js";
import { SnapshotService } from "../services/snapshot-service.js";
import { SCHEMA_VERSION, EXTRACT_VERSION, DICTIONARY_VERSION, IMPORTER_VERSION } from "../constants.js";
import type { PipelineContext } from "../types.js";

const args = process.argv.slice(2);
const mdbPath =
  args[args.indexOf("--mdb") + 1] ||
  process.env.MDB_LOCAL_PATH ||
  new URL("../../../../Dados.MDB", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

(async () => {
  const reader = new MdbReader({ password: process.env.MDB_PASSWORD || "" });
  const result = await reader.read(mdbPath);

  const context: PipelineContext = {
    runId: "extract-full-97",
    mode: "extract",
    mdbPath,
    dictionaryVersion: DICTIONARY_VERSION,
    warnings: [],
    errors: [],
    startedAt: new Date().toISOString(),
    metadata: {
      schemaVersion: SCHEMA_VERSION,
      extractVersion: EXTRACT_VERSION,
      dictionaryVersion: DICTIONARY_VERSION,
      importerVersion: IMPORTER_VERSION,
    },
  };

  const snapshotService = new SnapshotService();
  const snapshot = await snapshotService.create(result, context);
  const savedPath = await snapshotService.save(snapshot);

  console.log(`Tabelas extraídas: ${snapshot.metadata.totalTables}`);
  console.log(`Registros totais: ${snapshot.metadata.totalRows}`);
  console.log(`MDB SHA-256: ${snapshot.metadata.mdbHash}`);
  console.log(`Snapshot salvo em: ${savedPath}`);
  console.log("Hashes por tabela:");
  for (const [name, hash] of Object.entries(snapshot.checksums.perTable)) {
    console.log(`  ${name.padEnd(32)} ${hash.slice(0, 12)}`);
  }
})().catch((e) => {
  console.error("Erro na extração:", String(e).slice(0, 800));
  process.exit(1);
});
