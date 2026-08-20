# Relatório de Migração — SH Oficina → PostgreSQL (Homologação)

> **Data:** 05/08/2026
> **Banco alvo:** `mgv_homolog` (PostgreSQL local — porta 5432)
> **Origem:** `Dados.MDB` (SH Oficina) — SHA-256 `ff1e4a9e…27e971`, 87.527.424 bytes
> **Pipeline:** `scripts/migrations/` (EXTRACT → VALIDATE → NORMALIZE → MAP → PERSIST)

---

## 1. Resultado Final

| Métrica | Valor |
|---|---|
| **Registros tipados inseridos** | **92.891** (0 erros, 0 conflitos) |
| **Espelho bruto `legacy_raw`** | **93.841 registros — 97/97 tabelas OK** |
| **Entidades tipadas** | 38 ✅ (100%) |
| **Total de registros no MDB** | 93.841 |

A homologação contém **100% dos dados do SH Oficina**: tanto a réplica tipada
(92.891 registros em 38 entidades) quanto o espelho JSONB bruto de todas as 97
tabelas (`legacy_raw`), garantindo fidelidade total e auditoria independente do MDB.

---

## 2. Entidades Tipadas (réplica relacional)

| Entidade | Origem (MDB) | Inseridos | Status |
|---|---|---|---|
| Client | CLIENTES | 1.697 | ✅ |
| Device | EQUIPAMENTOS | 3.857 | ✅ |
| OrdemServico | ORDEMS | 5.030 (+33 rascunhos pulados) | ✅ |
| ServiceItem | OS_SERVICOS | 3.895 | ✅ |
| PartUsage | OS_PECAS | 2.018 | ✅ |
| Payment | CONTAS | 3.598 | ✅ |
| Part | ITENS | 587 | ✅ |
| Fornecedor | FORNECEDORES | 47 | ✅ |
| Funcionario | FUNCIONARIOS | 4 | ✅ |
| Banco | BANCOS | 156 | ✅ |
| EnderecoCliente | CLIENTES_ENDERECO | 0 (tabela vazia no MDB) | ✅ |
| OrdemHistorico | ORDEMS_CONTATO | 16.851 | ✅ |
| LancamentoCaixa | FCAIXA | 6.915 | ✅ |
| LancamentoCartao | CARTOES | 1.860 | ✅ |
| Cheque | CHEQUES | 1 | ✅ |
| ConvenioCartao | CONVENIO_CARTAO | 11 | ✅ |
| Despesa | DESPESAS | 0 (tabela vazia no MDB) | ✅ |
| PlanoContas | PLANOS | 10 | ✅ |
| ContaCorrente | CONTAS_CONTAS | 3 | ✅ |
| Venda | VENDAS | 40 | ✅ |
| VendaItem | ITENS_VENDA | 11 | ✅ |
| PedidoCompra | PEDIDOS | 151 | ✅ |
| PedidoCompraItem | ITENS_PEDIDO | 72 | ✅ |
| OrcamentoVenda | ORCAS | 3 | ✅ |
| OrcamentoPadrao | ORCA_PADRAO | 1 | ✅ |
| MovimentoEstoque (Entrada) | ITENS_ENTRADA | 1.034 | ✅ |
| MovimentoEstoque (Saída) | ITENS_SAIDA | 184 | ✅ |
| NfeConsumidor | NOTASFISCAIS_CONSUMIDOR | 272 | ✅ |
| NfeConsumidorItem | NOTASFISCAIS_CONSUMIDOR_ITENS | 430 | ✅ |
| NfeConsumidorForma | NOTASFISCAIS_CONSUMIDOR_FORMAS | 275 | ✅ |
| NotaCompra | NOTAS_COMPRAS | 177 | ✅ |
| NotaCompraItem | NOTAS_COMPRAS_ITENS | 536 | ✅ |
| NotaCompraFatura | NOTAS_COMPRAS_FATURAS | 276 | ✅ |
| NotaCompraCorrelacao | NOTAS_COMPRAS_COREL | 60 | ✅ |
| NotaServico | NOTAS_DESERVICOS | 2 | ✅ |
| LogLegado | LOGUSER | 25.793 | ✅ |
| IbptNcm | IBPT | 11.451 | ✅ |
| MunicipioIbge | NFE_UF_CIDADE | 5.566 | ✅ |
| SituacaoOs | SITUACOES | 17 | ✅ |

> ⚠️ **Observação OrdemServico:** o MDB tem 5.063 OS; **33 são rascunhos sem data de
> entrada nem cliente** (`ENTRADA === null && COD_CLIENTE === 0`) e são puladas por
> design do Mapper (não fazem sentido operacional). As 5.030 OS restantes foram
> 100% migradas. Elas permanecem no espelho `legacy_raw` para consulta.

---

## 3. Artefatos Gerados

| Artefato | Descrição |
|---|---|
| `.snapshots/sh-oficina-ff1e4a9e-20260805.json` | Snapshot das 97 tabelas com hashes por tabela |
| `temp_migration/Dados.MDB` | Backup do MDB (hash idêntico ao original) |
| `sql/legacy_schema.sql` | DDL das 36 tabelas legadas + espelho `legacy_raw` |
| `dictionary.json` (v2.0.0) | Dicionário de mapeamento: 38 entidades |
| `src/scripts/run_extract.mts` | Fase 1 — extração do snapshot |
| `src/scripts/apply_legacy_schema.mts` | Fase 2 — aplica o DDL na homologação |
| `src/scripts/run_load.mts` | Fase 5 — carga tipada + espelho (idempotente, `--truncate`, `--dry-run`) |
| `src/scripts/validate_homolog.mts` | Fase 6 — validação MDB × homologação |
| `src/scripts/setup_homolog.mts` / `setup_base_homolog.mts` | Fase 0 — preparação do banco |
| `src/scripts/drop_legacy_tables.mts` | Drop limpo das tabelas legadas (re-aplicar DDL) |

## 4. Correções Aplicadas Durante a Execução

1. **`plano_contas`**: `nivel`/`codigo_pai`/`codigo_filho` eram INT no DDL, mas o MDB
   guarda strings (`"01.01"`, `"001.004"`) → alterados para TEXT (schema + dicionário).
2. **`movimentos_estoque`**: faltava a coluna `fornecedor_id` → adicionada.
3. **`legacy_raw.id`**: era `UUID PRIMARY KEY` sem DEFAULT e o INSERT não fornecia id →
   adicionado `DEFAULT gen_random_uuid()`.
4. **Espelho em lotes**: tabelas > 16 mil linhas estouravam o limite de 65.535
   parâmetros do Postgres em um único INSERT → carga por lotes de 4.000.
5. **Colisão de `source_id` no espelho**: `NCM` (não único) em LCP116 gerava chaves
   duplicadas → `source_id` agora é PK + sufixo do hash da linha (único e idempotente).
6. **`movimentos_estoque` — saídas**: `ITENS_ENTRADA` e `ITENS_SAIDA` compartilham a
   sequência de `CODIGO`; a tabela única tem `legacy_id UNIQUE` → legacy_ids das saídas
   prefixados com `S-` (184 saídas preservadas, separadas por `tipo`).
7. **Conexão centralizada (segurança)**: a URL da homologação (com senha) estava
   hardcoded em 6 scripts → criado `src/scripts/db-config.ts` (`getHomologUrl()`/`getProdUrl()`)
   que lê `HOMOLOG_URL` do `.env` e falha rápido se ausente. `.env` atualizado.
8. **Estatística de inserções real**: `PgDbClient` retornava `cleanRecords.length` (sempre o
   total) mesmo com `ON CONFLICT DO NOTHING` → agora usa `res.rowCount` do PostgreSQL, então
   o log de "conflitos" reflete o que foi realmente inserido (verificado: re-execução sem
   truncate das tabelas núcleo pulou corretamente as 20.682 linhas já existentes).

## 5. Próximos Passos (não executados — decisão do proprietário)

1. **Cutover para produção (Supabase)**: aplicar `sql/legacy_schema.sql` + rodar a carga
   apontando `HOMOLOG_URL` para a produção (ou usar o mesmo fluxo com `DATABASE_URL`).
   Recomenda-se executar em horário de baixo movimento e com backup recente.
2. **Homologar consultas/relatórios**: criar views (ex.: conciliação financeira
   `lancamentos_caixa`, histórico de OS `ordens_historico`) antes de expor na UI.
3. **Decidir módulos futuros**: NFe/NFC-e históricas (`nfe_consumidor`, `notas_compra`)
   podem alimentar um futuro módulo fiscal; `log_legado` pode virar auditoria consultável.
4. **Descartar MDB** somente após período de validação em produção (o espelho
   `legacy_raw` passa a ser a fonte histórica oficial).

---
*Gerado automaticamente pelo pipeline de migração MGV One Hub.*
