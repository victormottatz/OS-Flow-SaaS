# Mapa do Banco de Dados Legado — Dados.MDB (SH Oficina)

> **Arquivo:** `Dados.MDB` (raiz do projeto) — 87,5 MB
> **Formato:** Microsoft Access (Jet/ACE), banco do sistema legado **SH Oficina**
> **Gerado em:** 05/08/2026 via `scripts/migrations/map_mdb.mjs` (lib `mdb-reader`)
> **Total:** **97 tabelas** — ~93.840 registros

> ⚠️ **Sobre as descrições:** o Access grava a "descrição" de cada tabela numa propriedade estendida (DAO) que a biblioteca `mdb-reader` não expõe. As descrições abaixo foram **inferidas da estrutura (colunas) e do uso no sistema legado**, e conferidas com a documentação do projeto. As tabelas em destaque são as **importadas para o MGV One Hub**.

---

## 1. Tabelas migradas para o MGV One Hub (núcleo da operação)

| Tabela | Registros | Descrição |
|---|---|---|
| **CLIENTES** | 1.697 | Cadastro mestre de clientes (PF/PJ): dados fiscais (CPF/CNPJ, IE/RG), endereço completo, telefones, e-mail, aniversário, situação, bloqueio, limites de crédito, campos de CRM, dados de cobrança Pix/criptomoedas e observações. Fonte da tabela `Client` no MGV. |
| **EQUIPAMENTOS** | 3.857 | Base instalada de equipamentos dos clientes: descrição, marca, modelo, série, patrimônio, data de compra, nota fiscal de aquisição, garantia e observações. Fonte da tabela `Device` no MGV. |
| **ORDEMS** | 5.063 | **Ordens de Serviço** — núcleo do negócio: cliente, equipamento, datas de entrada/pronto/saída, situação (status), valores (mão de obra, peças, deslocamento, terceiros, outros), defeito relatado, laudo, acessórios, garantia, NF vinculada, prioridade, sinal, técnico fixo e observações de serviço. Fonte da tabela `OrdemServico` no MGV. |
| **OS_SERVICOS** | 3.895 | Serviços executados em cada OS: descrição, técnico, quantidade, valores, custo, horário de início/fim e pedido vinculado. Vira os itens de serviço das OS no MGV. |
| **OS_PECAS** | 2.018 | Peças consumidas em cada OS: descrição, código da peça (referência `ITENS`), valor, custo, quantidade, técnico, data e baixa de estoque. Vira os itens de peças das OS no MGV. |
| **CONTAS** | 3.598 | Contas a pagar e a receber: tipo, cliente/fornecedor, vencimento, valor, parcela, plano de contas, juros, desconto, baixa (`PAGO`/`DATA_PGTO`), observações de cobrança. Fonte da tabela `Payment` no MGV. |

---

## 1b. Ordens de Serviço — tabelas complementares (não migradas)

| Tabela | Registros | Descrição |
|---|---|---|
| **ORDEMS_CONTATO** | 16.851 | Histórico cronológico de **contatos/andamentos** de cada OS: descrição, quem registrou, usuário e data. Ricos em contexto para auditoria das OS migradas. |
| **ORDEMS_DESLOCAMENTO** | 0 | Deslocamentos de técnico em campo: dia, horários e km de saída/chegada, alimentação e hospedagem. |
| **ORDEMS_INSUMOS** | 0 | Insumos consumidos na OS: item, quantidade, custo unitário e observações. |
| **ORDEMS_ExportErrors** | 7 | Erros registrados durante exportações de OS (mensagem, campo e linha). |

---

## 2. Estoque, Peças e Serviços

| Tabela | Registros | Descrição |
|---|---|---|
| **ITENS** | 587 | Catálogo de peças/produtos (estoque): código, nome, grupo/subgrupo, unidade, estoque mín/ideal/disp, custo/lucro/preço de venda, fornecedor, localização, NCM, CFOP, ICMS, GTIN, flag de serial (`USA_SERIAL`), flag de lote, fabricante, reforma tributária (CBS/IBS) e integração Mercado Livre. |
| **SERVICOS** | 5 | Catálogo de serviços da oficina: descrição, valor, comissão, grupo, custo unitário e código LC 116. |
| **ITENS_ENTRADA** | 1.034 | Movimentações de **entrada** de itens no estoque: item, quantidade, nota de compra, fornecedor, funcionário, data e observação. |
| **ITENS_SAIDA** | 184 | Movimentações de **saída** de itens: quantidade, funcionário, nota, OS, natureza e observação. |
| **ITENS_SERIAL** | 0 | Rastreabilidade de **número de série** de itens: série, nota de entrada/saída, data de movimentação, baixado. |
| **ITENS_PEDIDO** | 72 | Itens de pedidos de compra: item, quantidade, valores (IPI, ICMS, frete, seguro, desconto) e seriais. |
| **ITENS_VENDA** | 11 | Itens de vendas ao balcão: item, quantidade, preço, desconto, custo e pedido vinculado. |
| **ITENS_ORCA** | 0 | Itens de orçamentos de venda. |
| **ITENS_FABRICA** | 0 | Composição de **kits** (item "pai" → componentes), com quantidades e custo/venda. |
| **ITENS_FOTOS_ML** | 0 | Links de fotos de itens para anúncios no Mercado Livre. |
| **FORNECER_DE** | 235 | Fornecedores habilitados por item (preferência de compra e última compra). |
| **ICMS_UF** | 0 | Alíquotas de ICMS por item e UF. |

---

## 3. Financeiro e Caixa

| Tabela | Registros | Descrição |
|---|---|---|
| **FCAIXA** | 6.915 | **Fluxo de caixa** diário: receitas/despesas, plano de contas, conta corrente, forma de pagamento e autorização. |
| **CONTAS_CONTAS** | 3 | Contas correntes bancárias (descrição e saldo inicial). |
| **CONTAS_DEPOSITOS** | 0 | Depósitos lançados em contas correntes. |
| **CARTOES** | 1.860 | Lançamentos de **cartão de crédito/débito**: bandeira, número, parcelas, valor, cliente, resumo, compensação e observações. |
| **CHEQUES** | 1 | Cheques emitidos/recebidos: banco, agência, valor, cliente/fornecedor, emissão, compensação e status. |
| **BOLETOS** | 0 | Boletos emitidos (vencimento, valor, sacado, conta, nosso número). |
| **CONVENIO_BOLETO** | 0 | Configuração de convênio bancário para emissão de boletos (carteira, agência, conta, instruções e dias de protesto). |
| **CONVENIO_CARTAO** | 11 | Convênios com operadoras de cartão: comissões de crédito/débito, operações e bandeiras. |
| **DESPESAS** | 0 | Despesas avulsas (processo, descrição, valor, pago, dia). |
| **DESP_FIXAS** | 0 | Despesas fixas recorrentes (tipo, cliente, vencimento, plano de contas, valor). |
| **PLANOS** | 10 | Plano de contas hierárquico (pai/filho) para contabilidade. |
| **PARAMETROS** | 204 | Parâmetros gerais do sistema: nome, descrição, valor, posição na tela (PX/PY) e ativo. |

---

## 4. Vendas, Pedidos e Orçamentos

| Tabela | Registros | Descrição |
|---|---|---|
| **VENDAS** | 40 | Vendas (balcão/consumidor): operador, total, comissão, cliente, desconto, totais por tipo (serviços, peças, impostos, frete), NF e cupom vinculados, cancelamento. |
| **PEDIDOS** | 151 | Pedidos de compra a fornecedores: data, forma de pagamento, entrega, valores, situação, NF de compra vinculada, pagamento e rastreio de frete. |
| **ORCAS** | 3 | Orçamentos de venda (fora do fluxo de OS): total, comissão, situação e observação. |
| **ORCA_PADRAO** | 1 | Modelos de orçamento padrão (nome, observação, uso). |
| **ORCA_PADRAO_ITENS** | 0 | Itens dos orçamentos padrão (tipo, código e quantidade). |

---

## 5. Equipamentos, Contratos e Agenda

| Tabela | Registros | Descrição |
|---|---|---|
| **EQUIP_CONTRATO** | 0 | Vínculo equipamento ↔ contrato de manutenção. |
| **CONTRATOS** | 0 | Contratos de manutenção: valor, validade, cliente, franquia e descrição. |
| **ESQUEMAS** | 0 | Esquemas/desenhos de reparo por marca (nome, localização do arquivo, observação). |
| **AGENDA** | 6 | Agenda de compromissos da equipe: compromisso, data, hora, funcionário, realizado e OS vinculada. |
| **CHAMADO** | 0 | Chamados de atendimento: tipo, cliente (ou nome avulso), fones, e-mail, prioridade, realizado e observação. |
| **FUNCIONARIOS** | 4 | Funcionários: dados pessoais (CPF, CTPS, CNH), dados bancários, senha, flags de **técnico** e **vendedor**, datas de admissão/demissão. |

---

## 6. Fornecedores e Cadastros de Apoio

| Tabela | Registros | Descrição |
|---|---|---|
| **CLIENTES_ENDERECO** | 0 | Endereços adicionais de **entrega/cobrança** por cliente (loja, cidade, UF, CEP). |
| **FORNECEDORES** | 47 | Cadastro de fornecedores: razão/fantasia, CNPJ/IE, endereço, contato, transportadora, última compra. |
| **BANCOS** | 156 | Tabela nacional de bancos (número + nome). |
| **EMPRESAS** | 2 | Dados das empresas emitentes: identificação fiscal, endereço, CNAE, município, alíquotas de impostos e logos. |
| **USUARIOS** | 6 | Usuários do sistema com matriz de permissões (`A1`…`A45`) e e-mail. |
| **LOGUSER** | 25.793 | **Log de auditoria** de ações dos usuários: usuário, micro, ação, risco e data. |
| **SITUACOES** | 17 | Tabela de **status das OS**: nome, etapas, subgrupo, cores de fonte/fundo e plano de conta vinculado. |
| **COORD_IMPRES** | 13 | Coordenadas de impressão de campos em relatórios/cupons. |
| **Switchboard Items** | 1 | Menu de atalhos do Access (item padrão de qualquer MDB). |
| **CONFIG** | 1 | Configuração global do sistema: estoque/oficina, banco/contas, SMTP, modelo de venda, NF-e (formas, retenções, totais), destinatário de frete e impostos. |
| **ECF_CFG** | 1 | Configuração do ECF/impressora fiscal (modelo, porta, gaveta). |
| **OSPERSON** | 1 | Configurações do módulo de OS: textos dos modelos de recebimento/entrega/devolução, garantia, opções de impressão, boletins por e-mail e formatos de orçamento/venda. |

---

## 7. Fiscal — NF-e (modelo 55)

| Tabela | Registros | Descrição |
|---|---|---|
| **NOTASFISCAIS** | 0 | Notas fiscais de saída (NF-e): emitente/destinatário, totais de impostos (ICMS, IPI, PIS, COFINS, ISS, IRRF…), transportadora, frete, status de envio SEFAZ e XML armazenado. |
| **NOTASFISCAIS_FORMAS** | 0 | Duplicatas e formas de pagamento da NF-e. |
| **NOTASFISCAIS_ITENS_DETALHA** | 0 | Detalhamento fiscal de itens (veículos, armas, combustíveis — campos específicos por produto). |
| **NOTASFISCAIS_ITENS_RASTREABILIDADE** | 0 | Rastreabilidade de lotes dos itens da NF-e. |
| **NOTASFISCAIS_refNFP** | 0 | Referências a notas de produtor rural. |
| **NOTASFISCAIS_RETENCOES** | 0 | Retenções de impostos na NF-e (IRRF, CSLL, PIS, COFINS, INSS). |
| **NOTASFISCAIS_ENDERECOS** | 0 | Endereços da nota (destinatário, retirada, entrega). |
| **NOTASFISCAIS_XML** | 0 | XMLs completos das notas emitidas. |
| **NFE_INUTILIZADAS** | 3 | Numerações de NF-e inutilizadas (motivo e faixa). |
| **NFE_NUMERO_LOTE** | 0 | Controle de lotes de NF-e enviados à SEFAZ. |
| **NOTAS_CCE** | 0 | **Cartas de correção eletrônica** (CC-e) das NF-e. |
| **NOTAS_FATURAS** | 0 | Faturas/duplicatas de notas (número, vencimento, valor). |
| **ITENS_NOTA** | 0 | Itens de nota fiscal (estrutura antiga/migração): detalhamento completo por item com impostos. |

---

## 8. Fiscal — NFC-e (consumidor) e SAT

| Tabela | Registros | Descrição |
|---|---|---|
| **NOTASFISCAIS_CONSUMIDOR** | 272 | Cupons **NFC-e** emitidos: série, natureza, destinatário, totais, terminal, chave, protocolo e situação. |
| **NOTASFISCAIS_CONSUMIDOR_FORMAS** | 275 | Formas de pagamento das NFC-e (forma, valor, operadora, bandeira). |
| **NOTASFISCAIS_CONSUMIDOR_ITENS** | 430 | Itens das NFC-e com detalhamento fiscal completo (NCM, CFOP, CST, ICMS, PIS, COFINS, CBS/IBS). |
| **SAT_FISCAL_CONSUMIDOR** | 0 | Cupons **SAT** (SP): mesma estrutura das NFC-e. |
| **SAT_FISCAL_CONSUMIDOR_FORMAS** | 0 | Formas de pagamento dos cupons SAT. |
| **SAT_FISCAL_CONSUMIDOR_ITENS** | 0 | Itens dos cupons SAT. |

---

## 9. Fiscal — Compras (Entrada) e Serviços

| Tabela | Registros | Descrição |
|---|---|---|
| **NOTAS_COMPRAS** | 177 | Notas de **compra/entrada** (espelho do XML): emitente, transportadora, totais de impostos, referências e manifestação. |
| **NOTAS_COMPRAS_ITENS** | 536 | Itens das notas de compra com detalhamento fiscal (NCM, CFOP, CST, ICMS, IPI, PIS, COFINS, DI). |
| **NOTAS_COMPRAS_FATURAS** | 276 | Duplicatas das notas de compra (parcela, vencimento, valor). |
| **NOTAS_COMPRAS_COREL** | 60 | Correlação entre código interno e código do fornecedor. |
| **NOTAS_COMPRAS_DFE** | 0 | Manifestação do destinatário (DF-e): chave, NSU, evento. |
| **NOTAS_DESERVICOS** | 2 | **NFS-e** (notas de serviço): RPS, tomador, valores (ISS, PIS, COFINS, INSS, IR), tributos CBS/IBS e código de serviço municipal. |
| **NOTAS_CONTADOR** | 0 | Cadastro de contadores. |
| **NOTAS_CFOP** | 19 | Tabela de CFOPs com flags de efeito (estoque, contas, ICMS, ICMS-ST). |

---

## 10. Fiscal — Tabelas de Apoio (Tributos)

| Tabela | Registros | Descrição |
|---|---|---|
| **IBPT** | 11.451 | Impostos por NCM (IBPT): nacional/importado federal, estadual e municipal. |
| **ICMS_EMP** | 27 | Alíquotas interestaduais de ICMS por empresa e FCP. |
| **NFE_UF_CIDADE** | 5.566 | Tabela IBGE de UFs e municípios. |
| **LCP116** | 238 | Lista de serviços da **LC 116** (códigos de serviço). |
| **CST_CBSIBS** | 122 | Tabela de CST e classificação tributária **CBS/IBS** (reforma tributária). |
| **REGRAFISCAL** | 0 | Regras fiscais CBS/IBS (alíquotas, operações do governo). |
| **ITEM_REGRAFISCAL** | 0 | Vínculo item ↔ regra fiscal. |
| **TMP_REGRA_NFCE** | 0 | Tabela temporária de regras fiscais NFC-e. |
| **tblRegrasIndOp** | 26 | Indicadores de operação (reforma tributária): artigo, inciso, tipo de operação e local de consideração. |

---

## 11. Tabelas utilitárias / de erro

| Tabela | Registros | Descrição |
|---|---|---|
| **ORDEMS_ExportErrors** | 7 | Erros registrados em exportações de OS (mensagem, campo e linha). |
| **BOLETOS** / **CHAMADO** / **CALIBRACAO** | 0–1 | Ver seções acima (vazias ou quase vazias, sem uso na prática). |
| **CALIBRACAO** | 0 | Laudos de calibração de equipamentos (temperatura, umidade, responsável). |
| **CALIBRACAO_ENSAIOS** | 0 | Ensaios de uma calibração (descrição, mín/máx, obtido, unidade). |
| **CALIBRACAO_PADRAO** | 0 | Calibrações padrão. |
| **CALIBRACAO_PADRAO_ENSAIOS** | 0 | Ensaios das calibrações padrão. |
| **COORD_IMPRES** | 13 | Ver seção 6. |

---

## Observações importantes

1. **Divergência com o pipeline de migração:** a lista `MDB_TABLES` em `scripts/migrations/src/constants.ts` prevê tabelas que **não existem neste MDB** (ex.: `ESTOQUE`, `PRODUTO`, `MARCA`, `MODELO`, `GRUPO_FORNEC`, `SETOR`, `SUB GRUPO`, `PESSOA`, `SERVOS`, `USUARIO`, `VEICULOS`, `ORCAMENTOS`). No arquivo real, os equivalentes são `ITENS`, `SERVICOS`, `USUARIOS`, `ORCAS`, etc. Os scripts de importação devem ser ajustados para os nomes reais (ou para um CSV exportado do Access).
2. **`Dados1.mdb`** (referenciado em `scripts/migrations/import_fiscal_data.ts`) é outro arquivo legado com a tabela `ITENS` para dados fiscais — o mapa acima refere-se apenas ao `Dados.MDB`.
3. **Relação com o MGV:** apenas 6 tabelas são efetivamente migradas (`CLIENTES`, `EQUIPAMENTOS`, `ORDEMS`, `OS_SERVICOS`, `OS_PECAS`, `CONTAS`), mapeadas via `legacyId` para `Client`, `Device`, `OrdemServico` e `Payment`. O restante (fiscal, vendas, compras, caixa) é mantido no legado.
4. **Regeneração:** rodar `cd scripts/migrations && node map_mdb.mjs` após qualquer alteração no arquivo (requer `npm install` nesse diretório).
