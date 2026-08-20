// Dropa as tabelas legadas da homologação para reaplicar o DDL corrigido
import pg from "pg";
import { getHomologUrl } from "./db-config.js";
const pool = new pg.Pool({ connectionString: getHomologUrl() });
const tables = [
  "fornecedores", "funcionarios", "bancos", "enderecos_cliente", "ordens_historico",
  "lancamentos_caixa", "lancamentos_cartao", "cheques", "convenios_cartao", "despesas",
  "plano_contas", "contas_correntes", "vendas", "venda_itens", "pedidos_compra",
  "pedido_compra_itens", "orcamentos_venda", "orcamentos_padrao", "movimentos_estoque",
  "nfe_consumidor", "nfe_consumidor_itens", "nfe_consumidor_formas", "sat_fiscal_consumidor",
  "notas_compra", "notas_compra_itens", "notas_compra_faturas", "notas_compra_correlacao",
  "notas_servico", "log_legado", "ibpt_ncm", "municipios_ibge", "situacoes_os", "legacy_raw",
];
for (const t of tables) {
  await pool.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
}
await pool.end();
console.log(`Dropadas ${tables.length} tabelas legadas.`);
