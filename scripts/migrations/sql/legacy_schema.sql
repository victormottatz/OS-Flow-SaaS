-- ============================================================================
-- MGV One Hub — Schema dos módulos migrados do SH Oficina (Dados.MDB)
-- Aplicado apenas no banco de HOMOLOGAÇÃO (mgv_homolog).
-- Convenção: colunas em camelCase, nomes de tabela em snake_case,
-- sempre com legacy_id único para idempotência da carga.
-- ============================================================================

-- ============ CADASTROS ============

CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  razao_social TEXT DEFAULT '',
  fantasia TEXT DEFAULT '',
  cnpj_cpf TEXT DEFAULT '',
  ie_rg TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  fax TEXT DEFAULT '',
  email TEXT DEFAULT '',
  contato TEXT DEFAULT '',
  transportadora BOOLEAN DEFAULT false,
  site TEXT DEFAULT '',
  inscricao_municipal TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  cadastrado_em TIMESTAMP,
  ultima_compra_em TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nome TEXT DEFAULT '',
  cpf TEXT DEFAULT '',
  ci TEXT DEFAULT '',
  ctps TEXT DEFAULT '',
  cnh TEXT DEFAULT '',
  estado_civil TEXT DEFAULT '',
  regime TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  banco TEXT DEFAULT '',
  agencia TEXT DEFAULT '',
  conta TEXT DEFAULT '',
  tecnico BOOLEAN DEFAULT false,
  vendedor BOOLEAN DEFAULT false,
  demitido BOOLEAN DEFAULT false,
  senha TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  data_admissao TIMESTAMP,
  data_demissao TIMESTAMP,
  aniversario TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bancos (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  numero TEXT,
  nome TEXT
);

CREATE TABLE IF NOT EXISTS enderecos_cliente (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  cliente_legacy_id TEXT,
  cliente_id UUID,
  logradouro TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  complemento TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  data_cadastro TIMESTAMP
);

-- ============ OS COMPLEMENTARES ============

CREATE TABLE IF NOT EXISTS ordens_historico (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  os_legacy_id TEXT,
  ordem_servico_id UUID,
  descricao TEXT DEFAULT '',
  autor TEXT DEFAULT '',
  usuario TEXT DEFAULT '',
  data_cadastro TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ordens_historico_os ON ordens_historico (os_legacy_id);

CREATE TABLE IF NOT EXISTS deslocamentos_tecnicos (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  os_legacy_id TEXT,
  ordem_servico_id UUID,
  dia TIMESTAMP,
  hora_saida TEXT,
  km_saida TEXT,
  hora_chegada TEXT,
  km_chegada TEXT,
  hora_volta TEXT,
  km_volta TEXT,
  alimentacao BOOLEAN DEFAULT false,
  hospedagem BOOLEAN DEFAULT false
);

-- ============ FINANCEIRO ============

CREATE TABLE IF NOT EXISTS contas_correntes (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  descricao TEXT DEFAULT '',
  saldo_inicial TEXT DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS plano_contas (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nome TEXT DEFAULT '',
  nivel TEXT DEFAULT '',
  debito BOOLEAN DEFAULT false,
  codigo_pai TEXT DEFAULT '',
  codigo_filho TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS lancamentos_caixa (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  dia TIMESTAMP,
  tipo TEXT DEFAULT 'R',
  valor TEXT DEFAULT '0',
  receita TEXT DEFAULT '0',
  despesa TEXT DEFAULT '0',
  descricao TEXT DEFAULT '',
  plano_contas INT DEFAULT 0,
  conta_ref TEXT DEFAULT '',
  conta_corrente_legacy_id TEXT,
  conta_corrente_id UUID,
  forma_pagamento TEXT DEFAULT '',
  autorizacao TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_lancamentos_caixa_data ON lancamentos_caixa (dia);

CREATE TABLE IF NOT EXISTS lancamentos_cartao (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  bandeira TEXT DEFAULT '',
  numero_cartao TEXT DEFAULT '',
  nome TEXT DEFAULT '',
  validade TIMESTAMP,
  autorizacao TEXT DEFAULT '',
  parcelas INT DEFAULT 1,
  valor TEXT DEFAULT '0',
  cliente_legacy_id TEXT,
  cliente_id UUID,
  debito BOOLEAN DEFAULT false,
  conta_legacy_id TEXT,
  dia TIMESTAMP,
  compensado BOOLEAN DEFAULT false,
  observacao_compensacao TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cheques (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  banco TEXT DEFAULT '',
  agencia TEXT DEFAULT '',
  valor TEXT DEFAULT '0',
  cliente_legacy_id TEXT,
  cliente_id UUID,
  fornecedor_legacy_id TEXT,
  fornecedor_id UUID,
  emitido_em TIMESTAMP,
  compensar_em TIMESTAMP,
  compensado TEXT DEFAULT 'N',
  tipo TEXT DEFAULT 'R',
  conta TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  emitente TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS convenios_cartao (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nome TEXT DEFAULT '',
  comissao_cred TEXT DEFAULT '0',
  comissao_deb TEXT DEFAULT '0',
  op_cred TEXT DEFAULT '',
  op_deb TEXT DEFAULT '',
  cnpj_operadora TEXT DEFAULT '',
  bandeira TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  tipo TEXT DEFAULT '',
  descricao TEXT DEFAULT '',
  valor TEXT DEFAULT '0',
  pago BOOLEAN DEFAULT false,
  vencimento TIMESTAMP,
  plano_contas INT DEFAULT 0,
  observacao TEXT DEFAULT '',
  dia TIMESTAMP
);

-- ============ COMERCIAL ============

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  operador TEXT DEFAULT '',
  dia TIMESTAMP,
  total TEXT DEFAULT '0',
  comissao TEXT DEFAULT '0',
  cliente_legacy_id TEXT,
  cliente_id UUID,
  desconto TEXT DEFAULT '0',
  total_servicos TEXT DEFAULT '0',
  total_pecas TEXT DEFAULT '0',
  total_impostos TEXT DEFAULT '0',
  total_frete TEXT DEFAULT '0',
  transportadora TEXT DEFAULT '',
  situacao TEXT DEFAULT '',
  nf_numero TEXT,
  nfc_numero TEXT,
  nfs_numero TEXT,
  cancelada BOOLEAN DEFAULT false,
  observacao TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  venda_legacy_id TEXT,
  venda_id UUID,
  item_legacy_id TEXT,
  descricao TEXT DEFAULT '',
  servico BOOLEAN DEFAULT false,
  quantidade TEXT DEFAULT '1',
  valor_unitario TEXT DEFAULT '0',
  desconto TEXT DEFAULT '0',
  valor_total TEXT DEFAULT '0',
  unidade TEXT DEFAULT '',
  custo TEXT DEFAULT '0',
  dia TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos_compra (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  tipo TEXT DEFAULT '',
  data_pedido TIMESTAMP,
  forma_pagamento TEXT DEFAULT '',
  fornecedor_legacy_id TEXT,
  fornecedor_id UUID,
  transportador TEXT DEFAULT '',
  vendedor TEXT DEFAULT '',
  valor TEXT DEFAULT '0',
  situacao TEXT DEFAULT '',
  desconto TEXT DEFAULT '0',
  nf_numero TEXT,
  v_frete TEXT DEFAULT '0',
  v_seguro TEXT DEFAULT '0',
  v_outros TEXT DEFAULT '0',
  observacoes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pedido_compra_itens (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  pedido_legacy_id TEXT,
  pedido_id UUID,
  item_legacy_id TEXT,
  nome TEXT DEFAULT '',
  unidade TEXT DEFAULT '',
  quantidade TEXT DEFAULT '0',
  valor TEXT DEFAULT '0',
  ipi TEXT DEFAULT '0',
  icms TEXT DEFAULT '0',
  v_frete TEXT DEFAULT '0',
  v_seguro TEXT DEFAULT '0',
  v_desconto TEXT DEFAULT '0',
  v_outros TEXT DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS orcamentos_venda (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  operador TEXT DEFAULT '',
  dia TIMESTAMP,
  total TEXT DEFAULT '0',
  comissao TEXT DEFAULT '0',
  cliente_legacy_id TEXT,
  cliente_id UUID,
  desconto TEXT DEFAULT '0',
  total_servicos TEXT DEFAULT '0',
  total_pecas TEXT DEFAULT '0',
  total_impostos TEXT DEFAULT '0',
  vencimento TIMESTAMP,
  situacao TEXT DEFAULT '',
  observacao TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orcamentos_padrao (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nome TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  usado BOOLEAN DEFAULT false
);

-- ============ ESTOQUE (MOVIMENTAÇÃO) ============

CREATE TABLE IF NOT EXISTS movimentos_estoque (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  tipo TEXT DEFAULT 'ENTRADA',
  item_legacy_id TEXT,
  part_id UUID,
  quantidade TEXT DEFAULT '0',
  funcionario TEXT DEFAULT '',
  referencia TEXT DEFAULT '',
  os_legacy_id TEXT,
  ordem_servico_id UUID,
  nota TEXT DEFAULT '',
  fornecedor_legacy_id TEXT,
  fornecedor_id UUID,
  observacao TEXT DEFAULT '',
  data_movimento TIMESTAMP,
  serial TEXT DEFAULT '',
  baixado BOOLEAN DEFAULT false
);

-- ============ FISCAL — NFC-e / SAT (consumidor) ============

CREATE TABLE IF NOT EXISTS nfe_consumidor (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  origem TEXT DEFAULT 'NFC-e',
  producao BOOLEAN DEFAULT true,
  serie TEXT DEFAULT '',
  natureza TEXT DEFAULT '',
  emissao TIMESTAMP,
  dest_nome TEXT DEFAULT '',
  dest_email TEXT DEFAULT '',
  dest_cpf_cnpj TEXT DEFAULT '',
  total_vbc TEXT DEFAULT '0',
  total_vicms TEXT DEFAULT '0',
  total_vprod TEXT DEFAULT '0',
  total_vnf TEXT DEFAULT '0',
  terminal TEXT DEFAULT '',
  chave TEXT DEFAULT '',
  protocolo TEXT DEFAULT '',
  situacao TEXT DEFAULT '',
  data_cadastro TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nfe_consumidor_chave ON nfe_consumidor (chave);

CREATE TABLE IF NOT EXISTS nfe_consumidor_itens (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nfe_legacy_id TEXT,
  nfe_id UUID,
  item_tipo TEXT DEFAULT '',
  item_cean TEXT DEFAULT '',
  item_cprod TEXT DEFAULT '',
  item_xprod TEXT DEFAULT '',
  item_ncm TEXT DEFAULT '',
  item_cfop TEXT DEFAULT '',
  item_uncom TEXT DEFAULT '',
  item_qcom TEXT DEFAULT '0',
  item_vprod TEXT DEFAULT '0',
  item_vdesc TEXT DEFAULT '0',
  item_vfrte TEXT DEFAULT '0',
  item_vseg TEXT DEFAULT '0',
  item_cst TEXT DEFAULT '',
  item_origem TEXT DEFAULT '',
  data_cadastro TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nfe_consumidor_formas (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nfe_legacy_id TEXT,
  nfe_id UUID,
  forma TEXT DEFAULT '',
  valor TEXT DEFAULT '0',
  cnpj_operadora TEXT DEFAULT '',
  bandeira TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sat_fiscal_consumidor (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  producao BOOLEAN DEFAULT true,
  serie TEXT DEFAULT '',
  natureza TEXT DEFAULT '',
  emissao TIMESTAMP,
  dest_nome TEXT DEFAULT '',
  dest_cpf_cnpj TEXT DEFAULT '',
  total_vbc TEXT DEFAULT '0',
  total_vicms TEXT DEFAULT '0',
  total_vprod TEXT DEFAULT '0',
  total_vnf TEXT DEFAULT '0',
  terminal TEXT DEFAULT '',
  chave TEXT DEFAULT '',
  protocolo TEXT DEFAULT '',
  situacao TEXT DEFAULT '',
  data_cadastro TIMESTAMP
);

-- ============ FISCAL — Compras (entrada) ============

CREATE TABLE IF NOT EXISTS notas_compra (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  chave_nfe TEXT,
  numero TEXT DEFAULT '',
  serie TEXT DEFAULT '',
  data_emissao TIMESTAMP,
  data_saida_entrada TIMESTAMP,
  fornecedor_cnpj_cpf TEXT DEFAULT '',
  fornecedor_nome TEXT DEFAULT '',
  fornecedor_ie TEXT DEFAULT '',
  total_vbc TEXT DEFAULT '0',
  total_vicms TEXT DEFAULT '0',
  total_vprod TEXT DEFAULT '0',
  total_vipi TEXT DEFAULT '0',
  total_vnf TEXT DEFAULT '0',
  total_vfrete TEXT DEFAULT '0',
  total_vseg TEXT DEFAULT '0',
  total_vdesc TEXT DEFAULT '0',
  cfop TEXT DEFAULT '',
  natureza_operacao TEXT DEFAULT '',
  manifestado BOOLEAN DEFAULT false,
  inf_comprador TEXT DEFAULT '',
  inf_adic_fisco TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notas_compra_itens (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nota_legacy_id TEXT,
  nota_id UUID,
  cprod TEXT DEFAULT '',
  cean TEXT DEFAULT '',
  xprod TEXT DEFAULT '',
  ncm TEXT DEFAULT '',
  cfop TEXT DEFAULT '',
  ucom TEXT DEFAULT '',
  qcom TEXT DEFAULT '0',
  vuncom TEXT DEFAULT '0',
  vprod TEXT DEFAULT '0',
  vfrete TEXT DEFAULT '0',
  vseg TEXT DEFAULT '0',
  vdesc TEXT DEFAULT '0',
  voutro TEXT DEFAULT '0',
  orig TEXT DEFAULT '',
  cst_icms TEXT DEFAULT '',
  cst_pis TEXT DEFAULT '',
  cst_cofins TEXT DEFAULT '',
  cst_ipi TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notas_compra_faturas (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nota_legacy_id TEXT,
  nota_id UUID,
  parcela TEXT DEFAULT '',
  vencimento TIMESTAMP,
  valor TEXT DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS notas_compra_correlacao (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nota_legacy_id TEXT,
  nota_id UUID,
  fornecedor_cnpj TEXT DEFAULT '',
  fornecedor_cprod TEXT DEFAULT '',
  interno_cprod TEXT DEFAULT ''
);

-- ============ FISCAL — Serviços (NFS-e) ============

CREATE TABLE IF NOT EXISTS notas_servico (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  rps TEXT DEFAULT '',
  serie TEXT DEFAULT '',
  tipo TEXT DEFAULT '',
  data_emissao TIMESTAMP,
  tomador_cnpj TEXT DEFAULT '',
  tomador_razao TEXT DEFAULT '',
  tomador_endereco TEXT DEFAULT '',
  tomador_municipio TEXT DEFAULT '',
  tomador_uf TEXT DEFAULT '',
  tomador_cep TEXT DEFAULT '',
  tomador_email TEXT DEFAULT '',
  valor_servicos TEXT DEFAULT '0',
  base_calculo TEXT DEFAULT '0',
  valor_iss TEXT DEFAULT '0',
  valor_pis TEXT DEFAULT '0',
  valor_cofins TEXT DEFAULT '0',
  valor_inss TEXT DEFAULT '0',
  valor_ir TEXT DEFAULT '0',
  valor_csll TEXT DEFAULT '0',
  iss_retido BOOLEAN DEFAULT false,
  aliquota TEXT DEFAULT '0',
  codigo_servico TEXT DEFAULT '',
  codigo_municipio TEXT DEFAULT '',
  discriminacao TEXT DEFAULT '',
  tributacao_rps TEXT DEFAULT '',
  lote TEXT DEFAULT ''
);

-- ============ HISTÓRICO / AUDITORIA ============

CREATE TABLE IF NOT EXISTS log_legado (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  usuario TEXT DEFAULT '',
  micro TEXT DEFAULT '',
  acao TEXT DEFAULT '',
  risco TEXT DEFAULT '',
  data_log TIMESTAMP,
  payload JSONB
);

-- ============ TRIBUTÁRIO (referência) ============

CREATE TABLE IF NOT EXISTS ibpt_ncm (
  id UUID PRIMARY KEY,
  ncm TEXT,
  nacional_federal TEXT DEFAULT '0',
  importados_federal TEXT DEFAULT '0',
  estadual TEXT DEFAULT '0',
  municipal TEXT DEFAULT '0',
  tipo TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_ibpt_ncm ON ibpt_ncm (ncm);

CREATE TABLE IF NOT EXISTS municipios_ibge (
  id UUID PRIMARY KEY,
  uf_cod TEXT,
  uf_nome TEXT,
  cidade_cod TEXT,
  cidade_nome TEXT
);

CREATE TABLE IF NOT EXISTS situacoes_os (
  id UUID PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  nome TEXT DEFAULT '',
  etapa1 TEXT DEFAULT '',
  etapa2 TEXT DEFAULT '',
  etapa3 TEXT DEFAULT '',
  pronto BOOLEAN DEFAULT false,
  cor_fonte TEXT DEFAULT '',
  cor_fundo TEXT DEFAULT ''
);

-- ============ ESPELHO BRUTO (fidelidade 100%) ============

CREATE TABLE IF NOT EXISTS legacy_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  row_hash TEXT NOT NULL,
  imported_at TIMESTAMP DEFAULT now(),
  UNIQUE (source_table, source_id)
);
CREATE INDEX IF NOT EXISTS idx_legacy_raw_table ON legacy_raw (source_table);
