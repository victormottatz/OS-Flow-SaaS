import { fileURLToPath } from "node:url";
import { readFileSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { config } from "dotenv";
import minimist from "minimist";
import type { PipelineMode, DryRunMode } from "./types.js";
import type { DictionaryVersion } from "./types.js";
import { MdbReader } from "./readers/mdb-reader.js";
import { SnapshotService } from "./services/snapshot-service.js";
import { Validator } from "./services/validator.js";
import { Normalizer } from "./services/normalizer.js";
import { Mapper } from "./services/mapper.js";
import { PersistenceAdapter } from "./services/persistence-adapter.js";
import { Orchestrator } from "./services/orchestrator.js";
import { PgDbClient } from "./db/prisma-client.js";
import { DICTIONARY_PATH } from "./constants.js";
import { backfill } from "./scripts/backfill_parts_services.js";

const __filename = fileURLToPath(import.meta.url);
config({ path: resolve(dirname(__filename), "../../../.env") });

function loadDictionary(): DictionaryVersion {
  const raw = readFileSync(DICTIONARY_PATH, "utf-8");
  return JSON.parse(raw) as DictionaryVersion;
}

function buildServices() {
  const reader = new MdbReader({
    password: process.env.MDB_PASSWORD || ""
  });
  const snapshotService = new SnapshotService();
  const validator = new Validator();
  const normalizer = new Normalizer();
  const dictionary = loadDictionary();
  const mapper = new Mapper(dictionary);
  const db = new PgDbClient();
  const persistence = new PersistenceAdapter(db);

  return { reader, snapshotService, validator, normalizer, mapper, persistence, db };
}

async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2), {
    string: ["mode", "mdb", "snapshot", "dictionary", "tables"],
    boolean: ["verbose", "help"],
    alias: { m: "mode", f: "mdb", s: "snapshot", d: "dry-run", t: "tables", v: "verbose", h: "help" },
  });

  if (argv.help) {
    console.log(`
SH Oficina → MGV Migration Pipeline

Usage:
  node src/cli.ts --mode extract --mdb <file.mdb> [options]
  node src/cli.ts --mode transform --snapshot <snapshot.json> [options]
  node src/cli.ts --mode load [options]

Options:
  --mode, -m        Pipeline mode: extract | transform | load
  --mdb, -f         Path to .mdb file
  --snapshot, -s    Path to snapshot file (for transform mode)
  --dry-run, -d     Dry-run mode: full | partial | targeted
  --tables, -t      Comma-separated table names to import
  --verbose, -v     Verbose output
  --help, -h        Show this help
`);
    return;
  }

  const mode = (argv.mode || "extract") as PipelineMode;
  const mdbPath = argv.mdb as string | undefined;
  const snapshotPath = argv.snapshot as string | undefined;
  const dryRun = argv["dry-run"] as DryRunMode | undefined;
  const tables = argv.tables
    ? (argv.tables as string).split(",").map((t: string) => t.trim())
    : undefined;
  const verbose = !!argv.verbose;

  let finalMdbPath = mdbPath;

  if (mode === "extract") {
    const sourcePath = mdbPath || process.env.MDB_NETWORK_PATH;
    if (!sourcePath) {
      console.error("Error: --mdb parameter or MDB_NETWORK_PATH in .env is required for extract mode");
      process.exit(1);
    }

    const targetPath = process.env.MDB_LOCAL_PATH || resolve(process.cwd(), "temp_migration/Dados_copia.MDB");

    try {
      console.log(`[Segurança] Copiando banco de dados de: ${sourcePath}`);
      console.log(`[Segurança] Para cópia isolada em: ${targetPath}`);
      
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
      console.log("[Segurança] Cópia local concluída com sucesso.");
      
      finalMdbPath = targetPath;
    } catch (err: any) {
      console.error(`Erro ao realizar cópia local de segurança: ${err.message}`);
      process.exit(1);
    }
  }

  if (mode === "transform" && !snapshotPath) {
    console.error("Error: --snapshot is required for transform mode");
    process.exit(1);
  }

  const { reader, snapshotService, validator, normalizer, mapper, persistence, db } = buildServices();
  const orchestrator = new Orchestrator(reader, snapshotService, validator, normalizer, mapper, persistence);

  await db.connect();

  console.log("Loading existing client and device legacy mappings from database...");
  const clientMappings = await db.getLegacyMappings("clients");
  const deviceMappings = await db.getLegacyMappings("devices");
  const existingOsNumbers = await db.getExistingOsNumbers();
  console.log(`Loaded ${clientMappings.size} client mappings, ${deviceMappings.size} device mappings, and ${existingOsNumbers.size} OS numbers.`);

  const result = await orchestrator.run({
    mdbPath: finalMdbPath ?? "",
    mode,
    dryRun,
    snapshotPath,
    tables,
    verbose,
    clientMappings,
    deviceMappings,
    existingOsNumbers
  });

  await db.disconnect();

  if (result.status !== "FAILED" && !dryRun && (mode === "extract" || mode === "transform")) {
    console.log("\n[Pós-Processamento] Iniciando backfill de peças e serviços...");
    try {
      await backfill();
      console.log("[Pós-Processamento] Backfill concluído com sucesso.");
    } catch (bfErr) {
      console.error("[Pós-Processamento] Erro ao executar backfill:", bfErr);
    }
  }

  if (verbose) {
    console.log(`\nPipeline Result:`);
    console.log(`  Status:     ${result.status}`);
    console.log(`  Phase:      ${result.phase}`);
    console.log(`  Records:    ${result.totalRecords} total, ${result.createdRecords} created, ${result.skippedRecords} skipped`);
    console.log(`  Errors:     ${result.errorCount}`);
    console.log(`  Warnings:   ${result.warningCount}`);
    if (result.errors.length > 0) {
      console.log("\nErrors:");
      for (const err of result.errors) {
        console.log(`  [${err.code}] ${err.message}`);
      }
    }
  }

  if (result.status === "FAILED") process.exit(1);
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMainModule) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
