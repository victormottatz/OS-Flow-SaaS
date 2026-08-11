/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { OrdemServico } from "../types";

/**
 * Seções que um documento pode exibir. A presença de uma seção na lista
 * `secoes` de um template define o que é renderizado pelo DocumentShell.
 */
export type DocumentSection =
  | "cliente"
  | "equipamento"
  | "defeitoRelatado"
  | "acessorios"
  | "estadoFisico"
  | "checklistEntrada"
  | "laudoTecnico"
  | "pecasAplicadas"
  | "resumoFinanceiro"
  | "termosGarantia"
  | "assinaturas";

/**
 * Modelo de documento. Cada documento do sistema (termo, orçamento, recibo)
 * é descrito aqui — título, nome do arquivo PDF, cor de acento, seções e
 * textos — e renderizado pelo componente genérico `DocumentShell`.
 *
 * Para personalizar um modelo, basta editar esta config (ou criar uma nova
 * entrada) sem tocar no JSX de cada tela.
 */
export interface DocumentTemplate {
  /** Identificador único do template (ex: "termo"). */
  id: string;
  /** Nome do documento — exibido no selo do cabeçalho impresso. */
  titulo: string;
  /** Prefixo do nome do arquivo PDF salvo (ex: "Termo-Recebimento"). */
  nomeArquivo: string;
  /** Classe Tailwind da barra de acento superior. */
  corAcentual: string;
  /** Tamanho de fonte base do documento (classe Tailwind). Omitir para herdar o padrão do app. */
  textBase?: string;
  /** Classes Tailwind do selo (badge) do cabeçalho. */
  badgeClasse: string;
  /** Rótulo da data exibida no cabeçalho (Abertura, Emissão, Conclusão...). */
  dataRotulo: string;
  /** Seções renderizadas no documento. */
  secoes: DocumentSection[];
  /** Exibe o código de barras simulado no cabeçalho (usado no termo). */
  mostrarCodigoBarras?: boolean;
  /** Cláusulas de rodapé exibidas acima das assinaturas. */
  termosRodape?: string[];
  /** Título do bloco de termos/garantia (padrão: "Termos de Garantia, Condições e Custódia da Assistência:"). */
  termosTitulo?: string;
  /** Rótulo da coluna de assinatura do técnico. */
  tecnicoAssinatura: string;
  /** Rótulo da coluna de assinatura do cliente. */
  clienteAssinatura: string;
}

export type DocumentTemplateId = "termo" | "orcamento" | "recibo";

/** Dados do emitente (razão social, CNPJ e endereço) exibidos no cabeçalho de todos os documentos. */
export const COMPANY = {
  razaoSocial: "MOSAIAS LUIZ TEODORO LTDA",
  cnpj: "CNPJ: 24.181.336/0001-66 | IE: 797.187.310.116",
  endereco: "Rua Julio Prestes, 648, Jardim Sumaré, Ribeirão Preto - SP | Tel: (16) 99104-9631"
};

/** Arquivo do logo usado no PDF gerado no servidor (PNG — pdfkit não embute webp). */
export const COMPANY_LOGO_FILE = "LOGO V3.0 (3).png";

/**
 * Registro central de modelos de documentos do MGV One Hub.
 * Adicione um novo documento aqui e o DocumentShell passará a renderizá-lo.
 */
export const DOCUMENT_TEMPLATES: Record<DocumentTemplateId, DocumentTemplate> = {
  termo: {
    id: "termo",
    titulo: "TERMO DE RECEBIMENTO",
    nomeArquivo: "Termo-Recebimento",
    corAcentual: "bg-secondary-container",
    textBase: "text-xs",
    badgeClasse: "bg-secondary-container/10 border-secondary-container/30 text-slate-950",
    dataRotulo: "Abertura",
    mostrarCodigoBarras: true,
    secoes: [
      "cliente",
      "equipamento",
      "defeitoRelatado",
      "acessorios",
      "estadoFisico",
      "checklistEntrada",
      "termosGarantia",
      "assinaturas"
    ],
    termosRodape: [
      "1. O proprietário autoriza a abertura e desmontagem física do equipamento para diagnóstico pericial. Orçamentos têm validade legal de 10 dias corridos a partir da data de comunicação dos resultados pela equipe.",
      "2. Equipamentos prontos não retirados em até 90 dias caracterizam abandono conforme art. 1.275, inciso III, do Código Civil, autorizando a MGV Assistência Técnica a vender ou descartá-los para quitação de despesas laboratoriais.",
      "3. A MGV Assistência Técnica não se responsabiliza por integridade de softwares corporativos ou perda de informações de armazenamento. O backup de arquivos deve ser efetuado previamente pelo proprietário."
    ],
    tecnicoAssinatura: "Representante Técnico MGV",
    clienteAssinatura: "Assinatura do Cliente (De acordo)"
  },
  orcamento: {
    id: "orcamento",
    titulo: "ORÇAMENTO DE ASSISTÊNCIA TÉCNICA",
    nomeArquivo: "Orcamento",
    corAcentual: "bg-indigo-600",
    textBase: "text-[11px]",
    badgeClasse: "bg-slate-50 border-slate-300 text-slate-700",
    dataRotulo: "Emissão",
    secoes: [
      "cliente",
      "equipamento",
      "defeitoRelatado",
      "laudoTecnico",
      "pecasAplicadas",
      "resumoFinanceiro",
      "assinaturas"
    ],
    tecnicoAssinatura: "Técnico MGV Responsável",
    clienteAssinatura: "Assinatura do Cliente (De acordo)"
  },
  recibo: {
    id: "recibo",
    titulo: "RECIBO DE ENTREGA E GARANTIA",
    nomeArquivo: "Recibo-Entrega",
    corAcentual: "bg-emerald-600",
    textBase: "text-[11px]",
    badgeClasse: "bg-slate-50 border-slate-300 text-slate-700",
    dataRotulo: "Emissão",
    secoes: [
      "cliente",
      "equipamento",
      "defeitoRelatado",
      "laudoTecnico",
      "pecasAplicadas",
      "resumoFinanceiro",
      "termosGarantia",
      "assinaturas"
    ],
    termosTitulo: "Termo de Entrega e Garantia de Assistência:",
    termosRodape: [
      "1. A MGV Assistência Técnica declara garantia legal de 90 dias (conforme art. 26 do Código de Defesa do Consumidor - CDC) para todas as peças físicas substituídas e serviços discriminados neste laudo técnico, a contar da data de retirada descrita.",
      "2. A garantia aplica-se exclusivamente a falhas espontâneas das peças novas fornecidas. Estão integralmente excluídos da garantia danos causados por quedas, sobretensões elétricas na rede externa, oxidação por umidade local ou intervenções técnicas executadas por terceiros."
    ],
    tecnicoAssinatura: "Técnico MGV Responsável",
    clienteAssinatura: "Assinatura do Cliente (De acordo)"
  }
};

export function getDocumentTemplate(id: DocumentTemplateId | string): DocumentTemplate {
  return DOCUMENT_TEMPLATES[id as DocumentTemplateId] ?? DOCUMENT_TEMPLATES.orcamento;
}

/**
 * Resolve automaticamente orçamento × recibo conforme o status da OS,
 * espelhando o comportamento atual das listagens (recibo apenas quando a OS
 * está pronta para entrega ou finalizada).
 */
export function resolveTemplateForOS(os: OrdemServico): DocumentTemplate {
  return os.status === "PRONTO_RETIRADA" || os.status === "FINALIZADO"
    ? DOCUMENT_TEMPLATES.recibo
    : DOCUMENT_TEMPLATES.orcamento;
}

/** Total financeiro da OS para impressão (mesma regra usada nas listagens). */
export function getDocumentTotal(os: OrdemServico): number {
  if (os.totalCost !== undefined && os.totalCost !== null && os.totalCost > 0) {
    return os.totalCost;
  }
  const partsTotal = (os.usedParts || [])
    .filter((i) => i.category !== "SERVICO")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  return Math.max(0, partsTotal + (os.laborCost || 0) - (os.discount || 0));
}
