# Plano de Migração Completa — SH Oficina (Dados.MDB) → PostgreSQL (MGV One Hub)

> **Versão:** 1.0 — **Data:** 05/08/2026
> **Status:** Proposta para aprovação da diretoria
> **Documentos de apoio:** `docs/mapa_banco_legado_mdb.md` (mapa das 97 tabelas), `docs/HISTORICO_PROJETO.md`, `docs/BASE_DE_CONHECIMENTO_MGV.md`

---

## 1. Objetivo

Migrar **100% dos dados do banco legado `Dados.MDB` (SH Oficina)** para o novo banco **PostgreSQL** do MGV One Hub.

O que já foi migrado (7 tabelas operacionais — ver §2) **não será refeito**: este plano cobre as **~90 tabelas remanescentes** (~73 mil registros) dos módulos **fiscal, financeiro, comercial, cadastros e apoio**, garantindo que nenhum dado histórico do SH Oficina fique preso ao arquivo Access.

---

## 2. Estado atual (baseline auditado em 05/08/2026)

### 2.1. Já migrado (operação de assistência técnica — 100% concluído)

| Tabela SH Oficina | MDB | Entidade MGV | Supabase | Situação |
|---|---|---|---|---|
| CLIENTES | 1.697 | `Client` | 1.801 | ✅ 0 faltando (verificado) |
| EQUIPAMENTOS | 3.857 | `Device` | 3.949 | ✅ |
| ORDEMS | 5.063 | `OrdemServico` | 5.132 | ✅ |
| OS_SERVICOS | 3.895 | `ServiceItem` | 3.910 | ✅ |
| OS_PECAS | 2.018 | `PartUsage` | 2.028 | ✅ |
| CONTAS | 3.598 | `Payment` | 3.606 | ✅ |
| ITENS | 587 | `Part` | 638 | ✅ |

### 2.2. A migrar (módulos ainda no legado — ~73.125 registros)

| Domínio | Tabelas | Registros | Prioridade |
|---|---|---|---|
| Fiscal — NF-e (modelo 55) | NOTASFISCAIS, NOTASFISCAIS_FORMAS, NOTASFISCAIS_ITENS_DETALHA, NOTASFISCAIS_ITENS_RASTREABILIDADE, NOTASFISCAIS_refNFP, NOTASFISCAIS_RETENCOES, NOTASFISCAIS_ENDERECOS, NOTASFISCAIS_XML, NFE_INUTILIZADAS, NFE_NUMERO_LOTE, NOTAS_CCE, NOTAS_FATURAS, ITENS_NOTA | 3 | Alta (histórico) |
| Fiscal — NFC-e/SAT | NOTASFISCAIS_CONSUMIDOR (272), _FORMAS (275), _ITENS (430), SAT_FISCAL_CONSUMIDOR, SAT_FISCAL_CONSUMIDOR_FORMAS, SAT_FISCAL_CONSUMIDOR_ITENS | 977 | Alta (histórico) |
| Fiscal — Compras/NFS-e | NOTAS_COMPRAS (177), _ITENS (536), _FATURAS (276), _COREL (60), _DFE, NOTAS_DESERVICOS (2), NOTAS_CONTADOR, NOTAS_CFOP (19) | 1.070 | Alta (custos) |
| Financeiro e caixa | FCAIXA (6.915), CARTOES (1.860), CHEQUES (1), BOLETOS, CONVENIO_CARTAO (11), CONVENIO_BOLETO, DESPESAS, DESP_FIXAS, CONTAS_CONTAS (3), CONTAS_DEPOSITOS, PLANOS (10), PARAMETROS (204) | 9.004 | Alta |
| OS complementares | ORDEMS_CONTATO (16.851), ORDEMS_DESLOCAMENTO, ORDEMS_INSUMOS, ORDEMS_ExportErrors (7) | 16.858 | Alta (histórico de OS) |
| Vendas/pedidos/orçamentos | VENDAS (40), PEDIDOS (151), ITENS_PEDIDO (72), ITENS_VENDA (11), ORCAS (3), ORCA_PADRAO (1), ORCA_PADRAO_ITENS, ITENS_ORCA | 278 | Média |
| Estoque complementar | ITENS_ENTRADA (1.034), ITENS_SAIDA (184), ITENS_SERIAL, ITENS_FABRICA, ITENS_FOTOS_ML, ICMS_UF | 1.218 | Alta (movimentação) |
| Cadastros | FORNECEDORES (47), FORNECER_DE (235), BANCOS (156), FUNCIONARIOS (4), EMPRESAS (2), USUARIOS (6), LOGUSER (25.793), SITUACOES (17), CLIENTES_ENDERECO | 26.260 | Média |
| Tabelas tributárias | IBPT (11.451), ICMS_EMP (27), NFE_UF_CIDADE (5.566), LCP116 (238), CST_CBSIBS (122), tblRegrasIndOp (26), REGRAFISCAL, ITEM_REGRAFISCAL, TMP_REGRA_NFCE | 17.430 | Baixa (referência) |
| Equipamentos/contratos/agenda | CONTRATOS, EQUIP_CONTRATO, ESQUEMAS, AGENDA (6), CHAMADO | 6 | Média |
| Calibração | CALIBRACAO, CALIBRACAO_ENSAIOS, CALIBRACAO_PADRAO, CALIBRACAO_PADRAO_ENSAIOS | 0 | Baixa |
| Sistema legado | CONFIG (1), ECF_CFG (1), OSPERSON (1), COORD_IMPRES (13), Switchboard Items (1) | 17 | Descartar/arquivar |

---

## 3. Alvos do PostgreSQL

| Ambiente | Banco | Uso |
|---|---|---|
| **Produção (cloud)** | Supabase PostgreSQL (`DATABASE_URL`/`DIRECT_URL` no `.env`) | Banco real do MGV One Hub |
| **Local (intranet)** | PostgreSQL 15 via `docker-compose.yml` (`mgv-postgres`, porta 5432) | Réplica local da oficina |
| **Homologação** | Postgres de teste (novo banco no Supabase ou local) | Dry-run e validação **antes** da produção |

**Recomendação:** toda a carga definitiva deve ser executada primeiro em **homologação** e, só após aprovação do relatório de validação, replicada na produção.

---

## 4. Decisões de escopo (precisam de aprovação)

| # | Decisão | Recomendação |
|---|---|---|
| **D1** | Importar o histórico fiscal (NF-e/NFC-e/SAT/Notas de compra) como **tabelas históricas consultáveis**? | ✅ Sim — como camada "espelho bruto" + modelos tipados read-only (fonte de custos e auditoria). |
| **D2** | Importar FCAIXA/CARTOES/CHEQUES para o módulo financeiro do MGV? | ✅ Sim — o MGV terá dashboard financeiro; esses dados são o histórico de caixa. |
| **D3** | Importar ORDEMS_CONTATO (16.851 andamentos) vinculados às OS migradas? | ✅ Sim — como notas/histórico da `OrdemServico` (auditoria valiosa). |
| **D4** | Importar LOGUSER (25.793 logs) do SH Oficina? | ✅ Sim — como tabela de auditoria histórica (read-only). |
| **D5** | Tabelas de sistema (CONFIG, ECF_CFG, OSPERSON, COORD_IMPRES, Switchboard)? | ❌ Não migrar dados — arquivar snapshot; não têm utilidade no MGV. |
| **D6** | Tabelas tributárias (IBPT, ICMS_EMP, NFE_UF_CIDADE, LCP116, CST_CBSIBS)? | ⚠️ Importar apenas as usadas por módulo futuro (IBPT e NFE_UF_CIDADE são úteis). As demais ficam só no espelho. |
| **D7** | Onde ficará a **camada histórica** (espelho bruto)? | No mesmo PostgreSQL (schema `legacy_raw`) — evita dependência do MDB. |

---

## 5. Arquitetura-alvo no PostgreSQL

### 5.1. Estratégia em duas camadas

1. **Camada Operacional (tipada)** — modelos Prisma novos, com tipos corretos (moeda `Decimal`/`Float`, datas `DateTime`, FKs), prontos para uso nos novos módulos do MGV.
2. **Camada Histórica (espelho bruto)** — para **todas** as 97 tabelas: schema `legacy_raw` com uma tabela `legacy_raw_<nome>` (`source_table`, `source_id`, `payload JSONB`, `hash_linha`, `importado_em`). Garante **fidelidade 100%** e permite reconstruir/auditar qualquer dado sem depender do MDB.

### 5.2. Novos modelos Prisma propostos (por domínio)

```prisma
// === FISCAL — NF-e (modelo 55) ===
model Nfe { id, chaveNfe String @unique, numero, serie, dataEmissao, dataSaida,
  destinatarioNome, destinatarioCnpjCpf, naturezaOperacao, cfop,
  valorTotal, valorBaseIcms, valorIcms, valorIpi, valorPis, valorCofins,
  valorFrete, valorSeguro, valorDesconto, transportadora, statusSefaz,
  xml Json?, legacyId String? @unique, ... @@map("nfe") }

model NfeItem { id, nfeId FK, codigo, descricao, ncm, cfop, unidade, quantidade,
  valorUnitario, valorTotal, icmsCst, icmsAliq, valorIcms, ... @@map("nfe_items") }
model NfeFormaPagamento { ... } model NfeRetencao { ... }
model NfeEndereco { ... } model NfeReferenciaNfp { ... }

// === FISCAL — NFC-e / SAT ===
model NfeConsumidor { id, chave, serie, numero, dataEmissao, destinatarioCpf,
  valorTotal, terminal, protocolo, situacao, ... legacyId }
model NfeConsumidorItem { ... } model NfeConsumidorFormaPagamento { ... }
// (SAT usa as mesmas estruturas — model SatConsumidor ou flag "origem")

// === FISCAL — Compras (entrada) ===
model NotaCompra { id, chaveNfe, numero, serie, dataEmissao, fornecedorCnpj,
  fornecedorNome, valorTotal, valorIcms, valorIpi, manifestacaoDfe, ... legacyId }
model NotaCompraItem { ... } model NotaCompraFatura { ... } model NotaCompraCorrelacao { ... }

// === FISCAL — Serviços (NFS-e) ===
model NotaServico { id, rps, serie, tipo, dataEmissao, tomadorCnpj, tomadorNome,
  valorServicos, baseCalculo, valorIss, aliquota, codigoServico, codigoMunicipio,
  tributacaoRps, xml Json?, legacyId ... }

// === FINANCEIRO ===
model ContaCorrente { id, codigoLegado, descricao, saldoInicial }
model LancamentoCaixa { id, data, tipo (R/D), valor, descricao, planoContas,
  contaCorrenteId, formaPagamento, osId?, legacyId }           // ← FCAIXA
model LancamentoCartao { id, bandeira, numeroCartao, nome, valor, parcelas,
  debito Bool, compensado Bool, contaId, clienteId?, legacyId } // ← CARTOES
model Cheque { id, banco, agencia, numero, valor, tipo, clienteId?, fornecedorId?,
  emitidoEm, compensarEm, compensado, ... }                     // ← CHEQUES
model ConvenioCartao { id, nome, comissaoCred, comissaoDeb, operadoraCnpj, bandeira }
model Despesa { id, tipo, vencimento, valor, planoContas, observacao, recorrente Bool }
model PlanoContas { id, nome, nivel, codigoPai, ... }

// === COMERCIAL ===
model Venda { id, numero, data, operador, clienteId?, total, totalServicos,
  totalPecas, totalImpostos, desconto, situacao, nfeId?, cupomFiscal, legacyId }
model VendaItem { ... }
model PedidoCompra { id, numero, data, fornecedorId, formaPagamento, valores,
  situacao, nfeCompraId?, rastreio, legacyId }
model PedidoCompraItem { ... }
model OrcamentoVenda { ... } model OrcamentoPadrao { ... } model OrcamentoPadraoItem { ... }

// === CADASTROS ===
model Fornecedor { id, razaoSocial, fantasia, cnpjCpf, ieRg, endereco, contato,
  email, telefone, transportadora, ultimaCompra, legacyId }   // ← FORNECEDORES
model Funcionario { id, nome, cpf, ctps, cargo, tecnico Bool, vendedor Bool,
  dataAdmissao, dataDemissao, legacyId }                      // ← FUNCIONARIOS
model Banco { id, numero, nome }                               // ← BANCOS
model EnderecoCliente { ... }                                  // ← CLIENTES_ENDERECO

// === OS COMPLEMENTARES ===
model OrdemHistorico { id, ordemServicoId FK, descricao, autor, usuario,
  data, legacyId }                                             // ← ORDEMS_CONTATO
model DeslocamentoTecnico { id, ordemServicoId, dia, horaSaida, horaChegada,
  kmSaida, kmChegada, alimentacao, hospedagem }                 // ← ORDEMS_DESLOCAMENTO

// === TRIBUTÁRIO (referência) ===
model IbptNcm { id, ncm, nacionalFederal, importadosFederal, estadual, municipal, tipo }
model MunicipioIbge { id, ufCod, ufNome, cidadeCod, cidadeNome }  // ← NFE_UF_CIDADE

// === HISTÓRICO / AUDITORIA ===
model LogLegado { id, usuario, micro, acao, risco, data, payload Json? } // ← LOGUSER
```

> Nota: os modelos acima são o **esqueleto** — os campos exatos sairão do dicionário de mapeamento (Fase 3) e do schema real do MDB (`map_mdb.mjs`).

### 5.3. Estrutura das tabelas de apoio

- `legacy_raw.*` — espelho bruto de todas as 97 tabelas (JSONB).
- `migration_runs` / `migration_logs` / `migration_mappings` — **já existem no schema Prisma** (Fase de governança). Reutilizar.
- `legacy_ids` — mapa global `(source_table, source_id) → target_table, target_id` (o `MigrationMapping` já cobre isso).

---

## 6. Fases do Plano

O plano reutiliza o **pipeline de migração existente** (`scripts/migrations/`) com suas fases `EXTRACT → VALIDATE → NORMALIZE → MAP → PERSIST` e o dicionário `dictionary.json`.

### Fase 0 — Preparação e segurança (meio dia)
- [ ] Backup físico do `Dados.MDB` (cópia isolada em `temp_migration/Dados_copia.MDB` — já é o comportamento do `cli.ts` no modo extract).
- [ ] Registrar SHA-256 do arquivo (rastreabilidade — `MigrationRun.mdbHash`).
- [ ] Definir ambiente de homologação (banco novo) e `.env` separado (`HOMOLOG_DIRECT_URL`).
- [ ] Conferir codificação: MDB em **Latin-1** → converter para UTF-8 na extração (mdb-reader já decodifica; validar acentos no snapshot).
- **Entregável:** cópia de segurança + checksum + ambiente de homologação pronto.

### Fase 1 — Extração completa (1 dia)
- [ ] Gerar snapshot das **97 tabelas** via pipeline (`node src/cli.ts --mode extract --mdb Dados.MDB`).
- [ ] Validar contagem por tabela contra o mapa (`map_mdb.mjs`) — divergência = erro de extração.
- **Entregável:** snapshot JSON com hash por tabela (`sh-oficina-{hash8}-{date}.json`).

### Fase 2 — Modelagem do schema alvo (2–3 dias)
- [ ] Criar os modelos Prisma da §5.2 (novo arquivo `prisma/schema.legacy.prisma` ou ampliar `schema.prisma` com `@@map` para `legacy_*` onde fizer sentido).
- [ ] Criar schema `legacy_raw` (SQL puro ou migração Prisma) com espelho de todas as 97 tabelas.
- [ ] `prisma migrate dev` em homologação + `prisma db push` local.
- **Entregável:** migração SQL aplicada em homologação; modelo compilado (`tsc` + `prisma generate`).

### Fase 3 — Dicionário de mapeamento v2 (2–3 dias)
- [ ] Estender `dictionary.json` com as **novas entidades** (Nfe, NfeConsumidor, NotaCompra, LancamentoCaixa, Venda, PedidoCompra, Fornecedor, Funcionario, OrdemHistorico, etc.).
- [ ] Definir transformações reutilizáveis novas: `money-to-decimal`, `date-or-null`, `bool-sn`, `encode-utf8`, `resolve-fk-cliente`, `resolve-fk-fornecedor`, `resolve-fk-os`.
- [ ] Manter as 7 entidades já migradas no dicionário (usadas para o histórico de OS e FKs).
- **Entregável:** `dictionary.json` v2 versionado (`DICTIONARY_VERSION = "2.0.0"`).

### Fase 4 — Normalização e limpeza (2–3 dias)
Regras por domínio:
- **Moeda:** campos `VALOR`, `CUSTO`, `TOTAL` vêm como string `"320.0000"` → converter para `Decimal`/`Float` (regra `money-to-decimal` com fallback 0).
- **Datas:** valores inválidos/nulos → `null`; normalizar formato Access (`dd/mm/yyyy`) para ISO.
- **Booleans:** `"S"/"N"`, `true/false`, `0/1` → booleano real.
- **Encoding:** validar acentos (ex.: "Ribeirão Preto", "JESSICA CARVALHO \r\n..." — limpar `\r\n` de textos).
- **Deduplicação:** `VENDAS`/`ORCAS`/`PEDIDOS` sem chave natural — criar IDs sequenciais estáveis; conferir duplicidade de CNPJ em FORNECEDORES.
- **Integridade referencial:** resolver `COD_CLIENTE`, `COD_FORNECEDOR`, `COD_EQUIP`, `OS_NUM`, `COD_ITEM` via `MigrationMapping` (legacyId → uuid).
- **Ordem de carga:** Client → Device → Part → Fornecedor → OrdemServico → históricos/peças/serviços → financeiro/fiscal (dependências).
- **Entregável:** relatório de normalização (registros corrigidos por regra).

### Fase 5 — Carga em lotes (2–3 dias)
- [ ] Executar em **homologação**: `node src/cli.ts --mode transform --snapshot <arquivo> --dry-run full` → corrigir erros.
- [ ] Carga efetiva com `bulkInsert` em lotes de 500 (já implementado no `PersistenceAdapter`), gravando `MigrationMapping` para cada linha.
- [ ] Idempotência: re-execução não duplica (upsert por `legacyId`/chave natural).
- [ ] Carga do espelho `legacy_raw` (paralela, sempre idempotente).
- **Entregável:** execução concluída em homologação com relatório de resumo (created/updated/skipped/errors).

### Fase 6 — Validação e auditoria (1–2 dias)
- [ ] Contagem por tabela: MDB × homologação × produção — **zero divergência**.
- [ ] Amostras campo a campo (10 registros por tabela principal) conferindo valores e datas.
- [ ] Verificação de FKs órfãs (relatório de inconsistências).
- [ ] Teste de usabilidade: visão 360º do cliente com OS + histórico + financeiro; consultas de NF-e e caixa.
- [ ] Gerar `docs/relatorio_validacao_migracao.md`.
- **Entregável:** relatório de validação aprovado pela diretoria.

### Fase 7 — Cutover e rollback (1 dia)
- [ ] Congelar uso do SH Oficina (data de corte).
- [ ] Re-executar a carga em **produção** com o snapshot aprovado.
- [ ] Validar produção (contagens + amostras) — repetir Fase 6 na produção.
- [ ] Manter `Dados.MDB` arquivado (não deletar por 6 meses) + espelho `legacy_raw` como backup funcional.
- **Rollback:** como a carga é aditiva (nunca altera o que já existe), o rollback = truncar tabelas `legacy_*` novas e re-executar a partir do snapshot.

---

## 7. Regras de mapeamento por domínio (resumo)

| Tabela origem | Destino (modelo) | Regra especial |
|---|---|---|
| ORDEMS_CONTATO | `OrdemHistorico` | Resolver `COD_ORDEM` → `ordemServicoId` via legacyId da OS |
| FCAIXA | `LancamentoCaixa` | `RECEITA/DESPESA` → tipo; `FORMA` → forma de pagamento |
| CARTOES | `LancamentoCartao` | `COD_CLIENTE` → clienteId (opcional) |
| NOTASFISCAIS_CONSUMIDOR* | `NfeConsumidor` + itens/formas | Cabeçalho + detalhe + pagamentos (3 tabelas → 3 modelos) |
| NOTAS_COMPRAS* | `NotaCompra` + itens/faturas | Mesma lógica de desmembramento |
| ITENS_ENTRADA / ITENS_SAIDA | `MovimentoEstoque` (novo) | `COD_ITEM` → partId; `NOTA`/`OS` → referência |
| LOGUSER | `LogLegado` | Carga em bloco; sem FK |
| IBPT / NFE_UF_CIDADE | `IbptNcm` / `MunicipioIbge` | Carga direta (tabelas de referência) |
| CONFIG / ECF_CFG / OSPERSON / Switchboard | `legacy_raw` apenas | Não criar modelos |
| CALIBRACAO* | `legacy_raw` apenas (0 registros) | Criar modelo só se o módulo de calibração entrar no roadmap |

---

## 8. Governança e auditoria

- **Rastreabilidade:** toda linha migrada tem `MigrationMapping` (`source_table`, `source_id`, `target_table`, `target_id`) + hash da linha no `legacy_raw`.
- **Execuções:** cada rodada registrada em `MigrationRun` (hash do MDB, versões, contagens, erros, avisos).
- **Auditoria funcional:** `AuditLog` do MGV registra "IMPORT_LEGACY" por entidade (já existente no EventBus).
- **Relatório final:** `docs/relatorio_validacao_migracao.md` com tabela de divergências e aceite assinado.

---

## 9. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Codificação Latin-1 mal decodificada | Média | Médio | Validar acentos na Fase 1 e corrigir na NORMALIZE |
| Valores monetários em string | Alta | Médio | Regra `money-to-decimal` com fallback 0 e amostragem |
| Datas inválidas no Access | Média | Baixo | `date-or-null` + relatório de valores corrigidos |
| FKs órfãs (OS sem cliente, peça sem item) | Média | Médio | Resolver via `MigrationMapping`; órfãos viram referência textual + aviso |
| Dados fiscais sensíveis (LGPD) | Baixa | Alto | Camada histórica com acesso restrito; sem exposição na UI |
| Duplicação de CNPJ em FORNECEDORES/CLIENTES | Média | Médio | Deduplicação na NORMALIZE; relatório antes da carga |
| Volume (73k registros) | Baixa | Baixo | Irrelevante para Postgres; batches de 500 |
| Mudanças no MDB durante a migração | Baixa | Alto | Trabalhar sempre sobre a cópia isolada + checksum |

---

## 10. Cronograma estimado

| Fase | Duração | Marcos |
|---|---|---|
| 0. Preparação e segurança | 0,5 dia | Cópia + checksum + homologação |
| 1. Extração completa | 1 dia | Snapshot 97 tabelas validado |
| 2. Modelagem do schema alvo | 2–3 dias | Migração Prisma aplicada |
| 3. Dicionário v2 | 2–3 dias | dictionary.json v2 |
| 4. Normalização e limpeza | 2–3 dias | Relatório de normalização |
| 5. Carga em lotes (homologação) | 2–3 dias | Carga concluída |
| 6. Validação e auditoria | 1–2 dias | Relatório aprovado |
| 7. Cutover em produção | 1 dia | Produção validada |
| **Total** | **~12–17 dias úteis** | |

---

## 11. Critérios de aceite (checklist final)

- [ ] 100% das tabelas com dados presentes no `legacy_raw` (fidelidade total).
- [ ] Contagens MDB = homologação = produção (zero divergência) para todas as tabelas migradas.
- [ ] FKs resolvidas: histórico de OS vinculado; FCAIXA vinculável a cliente/OS quando existir.
- [ ] Módulo financeiro do MGV exibe FCAIXA/CARTOES/CONTAS corretamente.
- [ ] Consultas de NF-e/NFC-e históricas funcionam (tabelas read-only).
- [ ] Nenhuma OS, cliente, equipamento, peça ou conta existente foi alterada (carga 100% aditiva).
- [ ] Relatório de validação assinado; `Dados.MDB` arquivado com backup.

---

*Documento de planejamento — execução depende da aprovação das decisões D1–D7 da seção §4.*
