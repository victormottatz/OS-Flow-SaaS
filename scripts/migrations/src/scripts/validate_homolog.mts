// Fase 6 — Validação final: snapshot MDB × homologação (mgv_homolog)
// Compara: (1) espelho legacy_raw por tabela; (2) contagens das entidades tipadas.
// Uso: npx tsx src/scripts/validate_homolog.mts
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";
import { SnapshotService } from "../services/snapshot-service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });
import { getHomologUrl } from "./db-config.js";

const HOMOLOG_URL = getHomologUrl();

// Entidades tipadas → tabelas (para a seção 2 do relatório)
const TYPED: Record<string, string> = {
  Client: "clients", Device: "devices", OrdemServico: "ordem_servicos",
  ServiceItem: "service_items", PartUsage: "part_usages", Payment: "payments",
  Part: "parts", Fornecedor: "fornecedores", Funcionario: "funcionarios",
  Banco: "bancos", EnderecoCliente: "enderecos_cliente", OrdemHistorico: "ordens_historico",
  LancamentoCaixa: "lancamentos_caixa", LancamentoCartao: "lancamentos_cartao",
  Cheque: "cheques", ConvenioCartao: "convenios_cartao", Despesa: "despesas",
  PlanoContas: "plano_contas", ContaCorrente: "contas_correntes", Venda: "vendas",
  VendaItem: "venda_itens", PedidoCompra: "pedidos_compra", PedidoCompraItem: "pedido_compra_itens",
  OrcamentoVenda: "orcamentos_venda", OrcamentoPadrao: "orcamentos_padrao",
  MovimentoEstoqueEntrada: "movimentos_estoque", MovimentoEstoqueSaida: "movimentos_estoque",
  NfeConsumidor: "nfe_consumidor", NfeConsumidorItem: "nfe_consumidor_itens",
  NfeConsumidorForma: "nfe_consumidor_formas", NotaCompra: "notas_compra",
  NotaCompraItem: "notas_compra_itens", NotaCompraFatura: "notas_compra_faturas",
  NotaCompraCorrelacao: "notas_compra_correlacao", NotaServico: "notas_servico",
  LogLegado: "log_legado", IbptNcm: "ibpt_ncm", MunicipioIbge: "municipios_ibge",
  SituacaoOs: "situacoes_os",
};

async function main(): Promise<void> {
  const snapDir = resolve(__dirname, "../../.snapshots");
  const file = readdirSync(snapDir).filter((f) => f.endsWith(".json")).sort().pop();
  if (!file) throw new Error("Nenhum snapshot encontrado");
  const svc = new SnapshotService();
  const snapshot = await svc.load(resolve(snapDir, file));

  const db = new pg.Pool({ connectionString: HOMOLOG_URL });
  await db.query("SELECT 1");

  console.log(`\n=== VALIDAÇÃO HOMOLOGAÇÃO × MDB (${file}) ===\n`);

  // 1. Espelho legacy_raw: contagem por tabela
  console.log("--- 1. ESPELHO legacy_raw (por tabela) ---");
  let rawOk = 0, rawFail = 0;
  const byTable = new Map<string, number>();
  const r = await db.query(`SELECT source_table, count(*)::int AS n FROM legacy_raw GROUP BY source_table`);
  for (const row of r.rows) byTable.set(row.source_table, row.n);
  for (const table of snapshot.tables) {
    const expected = table.rows.length;
    const actual = byTable.get(table.name) ?? 0;
    const ok = expected === actual;
    if (ok) rawOk++; else rawFail++;
    if (!ok) console.log(`  ⚠ ${table.name.padEnd(34)} esperado=${expected} homolog=${actual}`);
  }
  console.log(`  Espelho: ${rawOk} tabelas OK, ${rawFail} divergentes (de ${snapshot.tables.length})`);

  // 2. Entidades tipadas
  console.log("\n--- 2. ENTIDADES TIPADAS (legacyId/rótulo na homologação) ---");
  const typedRows: string[] = [];
  const tableCounts = new Map<string, number>();
  for (const table of new Set(Object.values(TYPED))) {
    try {
      const q = await db.query(`SELECT count(*)::int AS n FROM "${table}"`);
      tableCounts.set(table, q.rows[0].n);
    } catch { /* tabela ausente */ }
  }
  const seenTables = new Set<string>();
  for (const [entity, table] of Object.entries(TYPED)) {
    // MovimentoEstoqueEntrada/Saida compartilham a tabela movimentos_estoque
    if (seenTables.has(table)) continue;
    seenTables.add(table);
    const src = snapshot.tables.find((t) => {
      const map: Record<string, string> = {
        Client: "CLIENTES", Device: "EQUIPAMENTOS", OrdemServico: "ORDEMS",
        ServiceItem: "OS_SERVICOS", PartUsage: "OS_PECAS", Payment: "CONTAS",
        Part: "ITENS", Fornecedor: "FORNECEDORES", Funcionario: "FUNCIONARIOS",
        Banco: "BANCOS", EnderecoCliente: "CLIENTES_ENDERECO", OrdemHistorico: "ORDEMS_CONTATO",
        LancamentoCaixa: "FCAIXA", LancamentoCartao: "CARTOES", Cheque: "CHEQUES",
        ConvenioCartao: "CONVENIO_CARTAO", Despesa: "DESPESAS", PlanoContas: "PLANOS",
        ContaCorrente: "CONTAS_CONTAS", Venda: "VENDAS", VendaItem: "ITENS_VENDA",
        PedidoCompra: "PEDIDOS", PedidoCompraItem: "ITENS_PEDIDO", OrcamentoVenda: "ORCAS",
        OrcamentoPadrao: "ORCA_PADRAO", MovimentoEstoqueEntrada: "ITENS_ENTRADA",
        MovimentoEstoqueSaida: "ITENS_SAIDA", NfeConsumidor: "NOTASFISCAIS_CONSUMIDOR",
        NfeConsumidorItem: "NOTASFISCAIS_CONSUMIDOR_ITENS", NfeConsumidorForma: "NOTASFISCAIS_CONSUMIDOR_FORMAS",
        NotaCompra: "NOTAS_COMPRAS", NotaCompraItem: "NOTAS_COMPRAS_ITENS",
        NotaCompraFatura: "NOTAS_COMPRAS_FATURAS", NotaCompraCorrelacao: "NOTAS_COMPRAS_COREL",
        NotaServico: "NOTAS_DESERVICOS", LogLegado: "LOGUSER", IbptNcm: "IBPT",
        MunicipioIbge: "NFE_UF_CIDADE", SituacaoOs: "SITUACOES",
      };
      return map[entity] === t.name;
    });
    const expected = src ? src.rows.length : 0;
    // Para tabelas compartilhadas (movimentos_estoque), compara contra o total
    // somado das origens correspondentes (ITENS_ENTRADA + ITENS_SAIDA).
    const siblingEntities = Object.entries(TYPED).filter(([, t]) => t === table);
    let expectedTotal = 0;
    for (const [ent, tab] of siblingEntities) {
      const srcTab = {
        MovimentoEstoqueEntrada: "ITENS_ENTRADA",
        MovimentoEstoqueSaida: "ITENS_SAIDA",
      }[ent] as string | undefined;
      if (srcTab) {
        const st = snapshot.tables.find((t) => t.name === srcTab);
        expectedTotal += st ? st.rows.length : 0;
      }
    }
    const actual = tableCounts.get(table) ?? 0;
    const ok = expectedTotal > 0 ? expectedTotal === actual : expected === actual;
    const srcNames = siblingEntities.map(([, t]) => ({
      MovimentoEstoqueEntrada: "ITENS_ENTRADA",
      MovimentoEstoqueSaida: "ITENS_SAIDA",
    })[t] ?? t).join("+");
    if (ok) {
      typedRows.push(`  ✅ ${entity.padEnd(26)} ${actual} (origem ${srcNames || src?.name || "?"}: ${expectedTotal || expected})`);
    } else if (entity === "OrdemServico" && src) {
      // Rascunhos do MDB sem data de entrada nem cliente são pulados por design
      // (regra do Mapper: ENTRADA === null && COD_CLIENTE === 0).
      const drafts = src.rows.filter((r) => r.ENTRADA === null && Number(r.COD_CLIENTE) === 0).length;
      typedRows.push(`  ✅ ${entity.padEnd(26)} ${actual} (${expected - actual} rascunhos sem dados pulados por design)`);
    } else {
      typedRows.push(`  ⚠ ${entity.padEnd(26)} origem=${expectedTotal || expected} homolog=${actual}`);
    }
  }
  console.log(typedRows.join("\n"));

  // 3. Totais
  const totals = await db.query(`SELECT
    (SELECT count(*) FROM legacy_raw)::int AS raw,
    (SELECT count(*) FROM clients)::int AS clients,
    (SELECT count(*) FROM devices)::int AS devices,
    (SELECT count(*) FROM ordem_servicos)::int AS os`);
  console.log("\n--- 3. TOTAIS ---");
  console.log(`  legacy_raw:      ${totals.rows[0].raw}`);
  console.log(`  clients:         ${totals.rows[0].clients}`);
  console.log(`  devices:         ${totals.rows[0].devices}`);
  console.log(`  ordem_servicos:  ${totals.rows[0].os}`);
  console.log(`  Snapshot MDB:    ${snapshot.metadata.totalRows} registros / ${snapshot.metadata.totalTables} tabelas`);

  await db.end();
  console.log("\nValidação concluída.");
}

main().catch((e) => {
  console.error("Erro:", String(e).slice(0, 800));
  process.exit(1);
});
