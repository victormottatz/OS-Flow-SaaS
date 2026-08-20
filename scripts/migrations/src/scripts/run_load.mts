// Fase 5 — Carga do snapshot na HOMOLOGAÇÃO (mgv_homolog)
// Uso:
//   npx tsx src/scripts/run_load.mts --dry-run                 # só mapeia e conta
//   npx tsx src/scripts/run_load.mts                           # carga na homologação
//   npx tsx src/scripts/run_load.mts --truncate                # limpa tabelas legadas antes
//   npx tsx src/scripts/run_load.mts --with-prod-fks           # resolve FKs lendo produção (somente SELECT)
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";
import { SnapshotService } from "../services/snapshot-service.js";
import { Validator } from "../services/validator.js";
import { Normalizer } from "../services/normalizer.js";
import { Mapper } from "../services/mapper.js";
import { PersistenceAdapter } from "../services/persistence-adapter.js";
import { PgDbClient } from "../db/prisma-client.js";
import { SCHEMA_VERSION, EXTRACT_VERSION, DICTIONARY_VERSION, IMPORTER_VERSION } from "../constants.js";
import type { PipelineContext, MappingOutput } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });
import { getHomologUrl, getProdUrl } from "./db-config.js";

const HOMOLOG_URL = getHomologUrl();
const PROD_URL = getProdUrl();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const TRUNCATE = args.includes("--truncate");
const WITH_PROD_FKS = args.includes("--with-prod-fks");

const LEGACY_TABLES = [
  "fornecedores", "funcionarios", "bancos", "enderecos_cliente", "ordens_historico",
  "lancamentos_caixa", "lancamentos_cartao", "cheques", "convenios_cartao", "despesas",
  "plano_contas", "contas_correntes", "vendas", "venda_itens", "pedidos_compra",
  "pedido_compra_itens", "orcamentos_venda", "orcamentos_padrao", "movimentos_estoque",
  "nfe_consumidor", "nfe_consumidor_itens", "nfe_consumidor_formas", "sat_fiscal_consumidor",
  "notas_compra", "notas_compra_itens", "notas_compra_faturas", "notas_compra_correlacao",
  "notas_servico", "log_legado", "ibpt_ncm", "municipios_ibge", "situacoes_os", "legacy_raw",
];

// Ordem de persistência (dependências: cabeçalhos antes de detalhes)
const PERSIST_ORDER: string[][] = [
  ["Client", "Device", "Part", "OrdemServico", "ServiceItem", "PartUsage", "Payment"],
  ["Fornecedor", "Funcionario", "Banco", "ContaCorrente", "PlanoContas", "ConvenioCartao", "SituacaoOs", "IbptNcm", "MunicipioIbge"],
  ["Venda", "PedidoCompra", "OrcamentoVenda", "OrcamentoPadrao", "NfeConsumidor", "NotaCompra", "NotaServico", "LogLegado", "LancamentoCaixa", "LancamentoCartao", "Cheque", "Despesa", "OrdemHistorico", "EnderecoCliente", "MovimentoEstoqueEntrada", "MovimentoEstoqueSaida"],
  ["VendaItem", "PedidoCompraItem", "NfeConsumidorItem", "NfeConsumidorForma", "NotaCompraItem", "NotaCompraFatura", "NotaCompraCorrelacao"],
];

// Chaves primárias comuns por tabela (para o espelho legacy_raw)
const PK_HINTS: Record<string, string[]> = {
  default: ["CODIGO", "NUMERO", "CHAVE", "CHAVE_NFC", "IDE_CHNFE", "IDPK", "ITEM_IDPK", "UF_COD", "NCM"],
  IBPT: ["CODIGO"],
  NFE_UF_CIDADE: ["UF_COD", "CID_COD"],
  Switchboard: ["SwitchboardID", "ItemNumber"],
};

interface LoadResult {
  entity: string;
  mapped: number;
  created: number;
  skipped: number;
  errors: number;
}

async function queryAll(pool: pg.Pool, sql: string): Promise<Record<string, unknown>[]> {
  const r = await pool.query(sql);
  return r.rows;
}

async function loadIdMaps(db: pg.Pool, withProd: boolean): Promise<Record<string, Map<string, string>>> {
  const maps: Record<string, Map<string, string>> = {
    clients: new Map(),
    devices: new Map(),
    os: new Map(),
    fornecedores: new Map(),
    vendas: new Map(),
    pedidos_compra: new Map(),
    nfe_consumidor: new Map(),
    notas_compra: new Map(),
  };

  const collect = async (pool: pg.Pool, label: string) => {
    for (const [key, sql] of Object.entries({
      clients: `SELECT id, "legacyId" FROM clients WHERE "legacyId" IS NOT NULL`,
      devices: `SELECT id, "legacyId" FROM devices WHERE "legacyId" IS NOT NULL`,
      os: `SELECT id, "osNumber" FROM ordem_servicos WHERE "osNumber" IS NOT NULL`,
      fornecedores: `SELECT id, legacy_id FROM fornecedores WHERE legacy_id IS NOT NULL`,
      vendas: `SELECT id, legacy_id FROM vendas WHERE legacy_id IS NOT NULL`,
      pedidos_compra: `SELECT id, legacy_id FROM pedidos_compra WHERE legacy_id IS NOT NULL`,
      nfe_consumidor: `SELECT id, legacy_id FROM nfe_consumidor WHERE legacy_id IS NOT NULL`,
      notas_compra: `SELECT id, legacy_id FROM notas_compra WHERE legacy_id IS NOT NULL`,
    })) {
      try {
        const rows = await queryAll(pool, sql);
        for (const row of rows) {
          const src = key === "os" ? String(row.osNumber) : String(row.legacyId ?? row.legacy_id);
          const id = String(row.id);
          if (src && id) maps[key].set(src, id);
        }
      } catch (e) {
        console.log(`  [${label}] aviso ao ler ${key}: ${String(e).slice(0, 120)}`);
      }
    }
  };

  await collect(db, "homologação");
  if (withProd && PROD_URL && PROD_URL !== HOMOLOG_URL) {
    const prod = new pg.Pool({ connectionString: PROD_URL });
    try {
      await collect(prod, "produção (somente leitura)");
    } finally {
      await prod.end();
    }
  }
  return maps;
}

function detectSourceId(row: Record<string, unknown>, table: string): string {
  const hints = PK_HINTS[table] ?? PK_HINTS.default;
  for (const h of hints) {
    if (row[h] !== undefined && row[h] !== null && String(row[h]) !== "") return String(row[h]);
  }
  return "";
}

function rowHash(row: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

async function main(): Promise<void> {
  // 1. Snapshot
  const snapDir = resolve(__dirname, "../../.snapshots");
  const file = readdirSync(snapDir).filter((f) => f.endsWith(".json")).sort().pop();
  if (!file) throw new Error("Nenhum snapshot encontrado");
  const svc = new SnapshotService();
  const snapshot = await svc.load(resolve(snapDir, file));
  console.log(`Snapshot: ${file} (${snapshot.metadata.totalTables} tabelas, ${snapshot.metadata.totalRows} registros)`);

  // 2. Validate + Normalize + Map
  const validator = new Validator();
  const validation = await validator.validate(snapshot, {} as PipelineContext);
  console.log(`Validação: ${validation.valid ? "OK" : `FALHOU (${validation.errors.length} erros)`}`);
  if (!validation.valid) {
    console.log(validation.errors.slice(0, 5).map((e) => `  [${e.code}] ${e.message}`).join("\n"));
  }

  const normalizer = new Normalizer();
  const normalized = await normalizer.normalize(snapshot, validation, {} as PipelineContext);

  // Mapeamentos da produção (somente leitura) para manter os MESMOS ids na réplica
  let clientMappings = new Map<string, string>();
  let deviceMappings = new Map<string, string>();
  let existingOsNumbers = new Set<string>();
  if (WITH_PROD_FKS && PROD_URL && PROD_URL !== HOMOLOG_URL) {
    const prod = new pg.Pool({ connectionString: PROD_URL });
    try {
      const c = await queryAll(prod, `SELECT id, "legacyId" FROM clients WHERE "legacyId" IS NOT NULL`);
      const d = await queryAll(prod, `SELECT id, "legacyId" FROM devices WHERE "legacyId" IS NOT NULL`);
      const o = await queryAll(prod, `SELECT "osNumber" FROM ordem_servicos WHERE "osNumber" IS NOT NULL`);
      for (const r of c) if (r.legacyId) clientMappings.set(String(r.legacyId), String(r.id));
      for (const r of d) if (r.legacyId) deviceMappings.set(String(r.legacyId), String(r.id));
      for (const r of o) if (r.osNumber) existingOsNumbers.add(String(r.osNumber));
      console.log(`Mapas da produção: ${clientMappings.size} clients, ${deviceMappings.size} devices, ${existingOsNumbers.size} OS.`);
    } finally {
      await prod.end();
    }
  }

  const dictionary = JSON.parse(readFileSync(resolve(__dirname, "../../dictionary.json"), "utf-8"));
  const mapper = new Mapper(dictionary);
  const context: PipelineContext = {
    runId: randomUUID(),
    mode: "transform",
    mdbPath: snapshot.metadata.mdbPath,
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
    clientMappings,
    deviceMappings,
    existingOsNumbers,
  };
  const mappings = await mapper.map(normalized, context);
  console.log(`Mapeados: ${mappings.length} registros`);

  // 3. Pós-processamento
  const caixa = mappings.filter((m) => m.entity === "LancamentoCaixa");
  for (const m of caixa) {
    const rec = Number.parseFloat(String(m.data.receita ?? "0")) || 0;
    const desp = Number.parseFloat(String(m.data.despesa ?? "0")) || 0;
    m.data.tipo = rec > 0 ? "R" : "D";
    m.data.valor = rec > 0 ? String(rec) : String(desp);
  }

  // ITENS_ENTRADA e ITENS_SAIDA compartilham a sequência de CODIGO no MDB,
  // mas a tabela alvo movimentos_estoque tem legacy_id UNIQUE. Prefixa as
  // saídas com "S-" para evitar colisão com as entradas (mesma tabela).
  for (const m of mappings) {
    if (m.entity === "MovimentoEstoqueSaida") {
      if (m.data.legacy_id != null) m.data.legacy_id = `S-${m.data.legacy_id}`;
      m.data.tipo = "SAIDA";
    }
  }

  // 4. Contagem por entidade (dry-run)
  const byEntity = new Map<string, number>();
  for (const m of mappings) byEntity.set(m.entity, (byEntity.get(m.entity) ?? 0) + 1);
  console.log("\n=== CONTAGEM POR ENTIDADE (mapeado) ===");
  for (const [e, n] of [...byEntity.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${e.padEnd(26)} ${n}`);
  }

  if (DRY_RUN) {
    console.log("\n[Dry-run] Nada foi gravado no banco.");
    return;
  }

  // 5. Banco alvo
  const db = new pg.Pool({ connectionString: HOMOLOG_URL });
  await db.query("SELECT 1");

  if (TRUNCATE) {
    for (const t of LEGACY_TABLES) await db.query(`TRUNCATE "${t}"`);
    console.log("Tabelas legadas truncadas (--truncate).");
  }

  console.log("\nCarregando mapas de FKs...");
  const maps = await loadIdMaps(db, WITH_PROD_FKS);
  console.log(`  clients: ${maps.clients.size}, devices: ${maps.devices.size}, OS: ${maps.os.size}, fornecedores: ${maps.fornecedores.size}`);

  const resolveId = (row: Record<string, unknown>, legacyKey: string, idKey: string, map: Map<string, string>) => {
    if (row[legacyKey] !== undefined && row[legacyKey] !== null && !row[idKey]) {
      const id = map.get(String(row[legacyKey]));
      if (id) row[idKey] = id;
    }
  };

  const persister = new PersistenceAdapter(new PgDbClient(HOMOLOG_URL) as never);
  const results: LoadResult[] = [];

  for (const group of PERSIST_ORDER) {
    for (const entity of group) {
      const rows = mappings.filter((m) => m.entity === entity).map((m) => m.data);
      if (rows.length === 0) {
        results.push({ entity, mapped: 0, created: 0, skipped: 0, errors: 0 });
        continue;
      }

      // Resolução de FKs
      for (const row of rows) {
        resolveId(row, "cliente_legacy_id", "cliente_id", maps.clients);
        resolveId(row, "fornecedor_legacy_id", "fornecedor_id", maps.fornecedores);
        resolveId(row, "os_legacy_id", "ordem_servico_id", maps.os);
        resolveId(row, "venda_legacy_id", "venda_id", maps.vendas);
        resolveId(row, "pedido_legacy_id", "pedido_id", maps.pedidos_compra);
        resolveId(row, "nfe_legacy_id", "nfe_id", maps.nfe_consumidor);
        resolveId(row, "nota_legacy_id", "nota_id", maps.notas_compra);
      }

      const res = await persister.bulkInsert(entity, rows);
      results.push({
        entity,
        mapped: rows.length,
        created: res.created,
        skipped: res.skipped,
        errors: res.errors.length,
      });
      console.log(`  ${entity.padEnd(26)} ${rows.length} mapeados → ${res.created} inseridos, ${res.skipped} conflitos, ${res.errors.length} erros`);

      // Após inserir as OS, usa os ids REAIS da homologação para o histórico
      if (entity === "OrdemServico") {
        const o = await db.query(`SELECT id, "osNumber" FROM ordem_servicos WHERE "osNumber" IS NOT NULL`);
        for (const row of o.rows) maps.os.set(String(row.osNumber), String(row.id));
        console.log(`  → mapa de OS atualizado: ${maps.os.size} OS na homologação`);
      }

      // Atualiza maps para os detalhes das próximas etapas
      const mapKey =
        entity === "Venda" ? "vendas"
        : entity === "PedidoCompra" ? "pedidos_compra"
        : entity === "NfeConsumidor" ? "nfe_consumidor"
        : entity === "NotaCompra" ? "notas_compra"
        : entity === "Fornecedor" ? "fornecedores"
        : null;
      if (mapKey) {
        const r = await db.query(`SELECT id, legacy_id FROM "${entity === "Fornecedor" ? "fornecedores" : mapKey === "vendas" ? "vendas" : mapKey === "pedidos_compra" ? "pedidos_compra" : mapKey === "nfe_consumidor" ? "nfe_consumidor" : "notas_compra"}" WHERE legacy_id IS NOT NULL`);
        for (const row of r.rows) {
          if (row.legacy_id) maps[mapKey].set(String(row.legacy_id), String(row.id));
        }
      }
    }
  }

  // 6. Espelho bruto legacy_raw
  console.log("\nCarregando espelho legacy_raw...");
  const RAW_BATCH = 4000; // 4 params/linha → máx 16.000 params por INSERT (limite PG = 65.535)
  let rawTotal = 0;
  for (const table of snapshot.tables) {
    if (table.rows.length === 0) continue;
    for (let i = 0; i < table.rows.length; i += RAW_BATCH) {
      const batch = table.rows.slice(i, i + RAW_BATCH);
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const row of batch) {
        // source_id sempre único: PK detectado (ou vazio) + sufixo do hash da linha.
        // Evita colisões quando o PK do legado não é único (ex.: NCM em LCP116).
        const pk = detectSourceId(row, table.name);
        const h = rowHash(row);
        const sid = pk ? `${pk}__${h.slice(0, 12)}` : h;
        values.push(h, JSON.stringify(row), sid, table.name);
        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        rawTotal++;
      }
      const sql = `INSERT INTO legacy_raw (row_hash, payload, source_id, source_table)
                   VALUES ${placeholders.join(", ")}
                   ON CONFLICT (source_table, source_id) DO UPDATE SET payload = EXCLUDED.payload, row_hash = EXCLUDED.row_hash`;
      try {
        await db.query(sql, values);
      } catch (e) {
        console.log(`  ERRO legacy_raw.${table.name}[${i}]: ${String(e).slice(0, 150)}`);
      }
    }
    const cnt = await db.query(`SELECT count(*)::int AS n FROM legacy_raw WHERE source_table = $1`, [table.name]);
    console.log(`  legacy_raw.${table.name.padEnd(30)} ${cnt.rows[0].n}`);
  }
  const totalRaw = await db.query(`SELECT count(*)::int AS n FROM legacy_raw`);
  console.log(`legacy_raw total: ${totalRaw.rows[0].n}`);

  await db.end();
  console.log("\n=== RESUMO ===");
  const totalCreated = results.reduce((s, r) => s + r.created, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);
  console.log(`Inseridos: ${totalCreated} | Erros: ${totalErrors} | Espelho: ${rawTotal}`);
}

main().catch((e) => {
  console.error("Erro:", String(e).slice(0, 800));
  process.exit(1);
});
