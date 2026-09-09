/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pdfMakeModule from "pdfmake/build/pdfmake.js";
import pdfVfs from "pdfmake/build/vfs_fonts.js";
import fs from "fs";
import path from "path";

import {
  COMPANY,
  COMPANY_LOGO_FILE,
  type DocumentTemplate,
  getDocumentTotal
} from "../config/documents.config";
import type { OrdemServico } from "../types";

// pdfmake 0.2.20: o módulo vfs_fonts exporta o mapa de fontes (Roboto) diretamente.
// Nota: default import (não namespace) — o objeto do módulo é mutável e aceita a
// atribuição de `vfs`; `import * as` criaria um namespace congelado no tsx.
const pdfMake: any = pdfMakeModule;
pdfMake.vfs = (pdfVfs as any)?.vfs ?? pdfVfs;

const FONT = "Roboto";
const PAGE_WIDTH = 595.28; // A4
const PAGE_MARGIN = 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function sectionTitle(text: string): any {
  return {
    text,
    fontSize: 6.5,
    bold: true,
    characterSpacing: 0.5,
    color: "#1e293b",
    margin: [0, 0, 0, 1]
  };
}

/** Caixa clara com borda fina (equivalente ao bg-slate-50 rounded do DocumentShell). */
function infoBox(stack: any[]): any {
  return {
    table: { widths: ["*"], body: [[{ stack, fillColor: "#f8fafc", margin: [6, 5, 6, 6] }]] },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.4 : 0),
      vLineWidth: () => 0.4,
      hLineColor: () => "#e2e8f0",
      vLineColor: () => "#e2e8f0",
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0
    }
  };
}

const lightTableLayout: any = {
  hLineWidth: (i: number) => (i === 0 ? 0.6 : 0.3),
  vLineWidth: () => 0,
  hLineColor: () => "#cbd5e1",
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3
};

function statusLabel(status: string | undefined): string {
  if (status === "OK") return "OK";
  if (status === "AVARIA") return "AVARIA";
  return "N/A";
}

function statusColor(status: string | undefined): string {
  if (status === "OK") return "#047857";
  if (status === "AVARIA") return "#be123c";
  return "#64748b";
}

let cachedLogo: { image: string; width: number } | null | undefined;

/** Lê o logo da empresa (PNG) para embutir no PDF (cacheado — lido uma única vez). */
function loadCompanyLogo(): { image: string; width: number } | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const candidates = [
      path.join(process.cwd(), "public", "logos", COMPANY_LOGO_FILE),
      path.join(process.cwd(), "dist", "logos", COMPANY_LOGO_FILE)
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const base64 = fs.readFileSync(p).toString("base64");
        cachedLogo = { image: `data:image/png;base64,${base64}`, width: 84 };
        return cachedLogo;
      }
    }
    cachedLogo = null;
    return cachedLogo;
  } catch (err) {
    console.warn("[pdfService] Logo não encontrado, seguindo sem imagem:", err);
    cachedLogo = null;
    return cachedLogo;
  }
}

// ---------------------------------------------------------------------------
// Builder do documento
// ---------------------------------------------------------------------------

export type PdfOsData = OrdemServico & {
  client?: any;
  device?: any;
  usedParts?: any[];
  checklistEntrada?: any[];
};

export interface PdfCompanyInfo {
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  phone?: string;
  logoBase64?: string;
}

/**
 * Gera o buffer PDF de um documento (termo, orçamento ou recibo) a partir do
 * template central (src/config/documents.config.ts) e dos dados da OS.
 */
export async function buildDocumentPdf(
  template: DocumentTemplate,
  os: PdfOsData,
  dataEmissao?: string,
  companyInfo?: PdfCompanyInfo
): Promise<Buffer> {
  const wants = (s: string) => template.secoes.includes(s as any);
  const total = getDocumentTotal(os as OrdemServico);
  const client = os.client;
  const device = os.device;
  const usedParts = Array.isArray(os.usedParts) ? os.usedParts : [];
  const checklist = Array.isArray(os.checklistEntrada) ? os.checklistEntrada : [];
  // dataEmissao é opcional e pode vir inválido do cliente — valida antes de usar.
  const parsedEmissao = dataEmissao ? new Date(dataEmissao) : null;
  const data =
    parsedEmissao && !isNaN(parsedEmissao.getTime()) ? parsedEmissao : os.createdAt;
  
  // Resolve o logo da empresa (customizado do tenant ou padrão)
  let logo: { image: string; width: number } | null = null;
  if (companyInfo?.logoBase64) {
    logo = { image: companyInfo.logoBase64, width: 84 };
  } else {
    logo = loadCompanyLogo();
  }

  const empRazao = companyInfo?.razaoSocial || COMPANY.razaoSocial;
  const empCnpj = companyInfo?.cnpj || COMPANY.cnpj;
  const empEndereco = companyInfo?.endereco || COMPANY.endereco;

  const content: any[] = [];

  // ----- Cabeçalho: logo + emitente (esquerda) / selo + OS + data (direita) -----
  const headerLeftStack: any[] = [
    { text: empRazao, fontSize: 10.5, bold: true, color: "#0f172a" },
    { text: empCnpj, fontSize: 6.5, color: "#64748b", margin: [0, 2, 0, 0] },
    { text: empEndereco, fontSize: 6.5, color: "#64748b", margin: [0, 1, 0, 0] }
  ];
  if (logo) {
    headerLeftStack.unshift({ image: logo.image, width: logo.width, margin: [0, 0, 0, 3] });
  }

  const headerRight: any = {
    stack: [
      {
        table: {
          widths: ["auto"],
          body: [
            [
              {
                text: template.titulo,
                alignment: "center",
                fontSize: 6.5,
                bold: true,
                color: "#334155",
                fillColor: "#f1f5f9",
                margin: [8, 3, 8, 3]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#cbd5e1",
          vLineColor: () => "#cbd5e1",
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0
        }
      },
      {
        text: os.osNumber || "OS",
        fontSize: 20,
        bold: true,
        color: "#0f172a",
        alignment: "right",
        margin: [0, 4, 0, 0]
      },
      {
        text: `${template.dataRotulo}: ${fmtDate(data)}`,
        fontSize: 6.5,
        color: "#94a3b8",
        alignment: "right",
        margin: [0, 1, 0, 0]
      }
    ],
    alignment: "right"
  };

  content.push({ columns: [headerLeftStack, headerRight], columnGap: 12 });
  content.push({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: PAGE_WIDTH - PAGE_MARGIN * 2, y2: 0, lineWidth: 0.6, lineColor: "#cbd5e1" }],
    margin: [0, 6, 0, 0]
  });

  // ----- Cliente + Equipamento (lado a lado) -----
  if (wants("cliente") || wants("equipamento")) {
    const cols: any[] = [];
    if (wants("cliente")) {
      cols.push(
        infoBox([
          sectionTitle("Dados do Proprietário"),
          { text: client?.name || "N/D", fontSize: 8.5, bold: true, color: "#0f172a", margin: [0, 3, 0, 0] },
          { text: `Documento: ${client?.cpfCnpj || "N/D"}`, fontSize: 6.5, color: "#334155", margin: [0, 2, 0, 0] },
          { text: `Contato: ${client?.phone || "N/D"}`, fontSize: 6.5, color: "#334155", margin: [0, 1, 0, 0] },
          ...(client?.email
            ? [{ text: `E-mail: ${client.email}`, fontSize: 6.5, color: "#334155", margin: [0, 1, 0, 0] }]
            : []),
          ...(client?.address || client?.zipCode
            ? [{ text: `Endereço: ${client?.address || "N/D"}${client?.zipCode ? ` - CEP: ${client.zipCode}` : ""}`, fontSize: 6.5, color: "#64748b", margin: [0, 2, 0, 0] }]
            : [])
        ])
      );
    }
    if (wants("equipamento")) {
      const deviceName = [device?.type, device?.brand].filter(Boolean).join(" - ") || "Equipamento";
      cols.push(
        infoBox([
          sectionTitle("Equipamento em Custódia"),
          { text: deviceName, fontSize: 8.5, bold: true, color: "#0f172a", margin: [0, 3, 0, 0] },
          { text: `Modelo: ${device?.model || "N/D"}`, fontSize: 6.5, color: "#334155", margin: [0, 2, 0, 0] },
          { text: `N/S: ${device?.serialNumber || "Sem Série"}`, fontSize: 6.5, color: "#334155", margin: [0, 1, 0, 0] },
          ...(device?.description
            ? [{ text: `Estética: ${device.description}`, fontSize: 6.5, color: "#64748b", italics: true, margin: [0, 2, 0, 0] }]
            : [])
        ])
      );
    }
    content.push({ columns: cols, columnGap: 8, margin: [0, 8, 0, 0] });
  }

  // ----- Defeito relatado -----
  if (wants("defeitoRelatado")) {
    content.push({
      stack: [
        sectionTitle("Defeito Relatado pelo Solicitante"),
        {
          text: `"${os.reportedDefect || "N/D"}"`,
          fontSize: 7,
          italics: true,
          color: "#334155",
          margin: [0, 3, 0, 0]
        }
      ],
      margin: [0, 8, 0, 0]
    });
  }

  // ----- Acessórios + Estado físico -----
  if (wants("acessorios") || wants("estadoFisico")) {
    const cols: any[] = [];
    if (wants("acessorios")) {
      cols.push(
        infoBox([
          sectionTitle("Acessórios Deixados na Oficina"),
          { text: os.accessoriesLeft || "Nenhum acessório adicional entregue.", fontSize: 7, color: "#334155", margin: [0, 3, 0, 0] }
        ])
      );
    }
    if (wants("estadoFisico")) {
      cols.push(
        infoBox([
          sectionTitle("Estado Físico / Condições do Dispositivo"),
          { text: os.physicalState || "Sem avarias visuais descritas.", fontSize: 7, color: "#334155", margin: [0, 3, 0, 0] }
        ])
      );
    }
    content.push({ columns: cols, columnGap: 8, margin: [0, 8, 0, 0] });
  }

  // ----- Checklist de entrada -----
  if (wants("checklistEntrada") && checklist.length > 0) {
    content.push({
      stack: [
        sectionTitle("Checklist de Entrada do Equipamento"),
        {
          table: {
            widths: ["*", 45, "*"],
            body: [
              ...checklist.map((item: any) => [
                { text: item.label || "", fontSize: 6.5, color: "#334155" },
                {
                  text: statusLabel(item.status),
                  fontSize: 6.5,
                  bold: true,
                  alignment: "center",
                  color: statusColor(item.status)
                },
                { text: item.observacao || "", fontSize: 6.5, color: "#64748b", italics: true }
              ])
            ]
          },
          layout: lightTableLayout,
          margin: [0, 3, 0, 0]
        }
      ],
      margin: [0, 8, 0, 0]
    });
  }

  // ----- Laudo técnico -----
  if (wants("laudoTecnico")) {
    content.push({
      stack: [
        sectionTitle("Laudo e Ações Técnicas"),
        {
          text: os.diagnostic || "Serviço efetuado com diagnóstico conclusivo da equipe técnica.",
          fontSize: 7,
          color: "#1e293b",
          lineHeight: 1.35,
          margin: [0, 3, 0, 0]
        }
      ],
      margin: [0, 8, 0, 0]
    });
  }

  // ----- Peças aplicadas -----
  if (wants("pecasAplicadas") && usedParts.length > 0) {
    const head = (t: string, alignment: any = "left") => ({
      text: t,
      fontSize: 6,
      bold: true,
      color: "#64748b",
      alignment
    });
    content.push({
      stack: [
        sectionTitle("Insumos e Peças Aplicadas"),
        {
          table: {
            widths: ["*", 30, 60, 60],
            body: [
              [head("Descrição da Peça"), head("Qtd", "center"), head("Preço Un.", "right"), head("Total", "right")],
              ...usedParts.map((item: any) => [
                {
                  text: item.name || "—",
                  fontSize: 6.5,
                  color: "#334155",
                  bold: true,
                  ...(item.serialNumber ? { margin: [0, 0, 0, 1] } : {})
                },
                { text: String(item.quantity ?? 1), fontSize: 6.5, alignment: "center", color: "#334155" },
                { text: money(item.price), fontSize: 6.5, alignment: "right", color: "#334155" },
                {
                  text: money((Number(item.price) || 0) * (Number(item.quantity) || 1)),
                  fontSize: 6.5,
                  alignment: "right",
                  bold: true,
                  color: "#0f172a"
                }
              ])
            ]
          },
          layout: lightTableLayout,
          margin: [0, 3, 0, 0]
        }
      ],
      margin: [0, 8, 0, 0]
    });
  }

  // ----- Resumo financeiro (barra escura) -----
  if (wants("resumoFinanceiro")) {
    content.push({
      table: {
        widths: ["*", "auto"],
        body: [
          [
            {
              text: "Resumo Financeiro da OS",
              fontSize: 7,
              bold: true,
              color: "#c7d2fe",
              characterSpacing: 1,
              margin: [8, 6, 8, 6]
            },
            {
              text: `Total: ${money(total)}`,
              fontSize: 11,
              bold: true,
              color: "#34d399",
              alignment: "right",
              margin: [8, 6, 8, 6]
            }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => "#0f172a",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },
      margin: [0, 10, 0, 0]
    });
  }

  // ----- Termos de garantia / rodapé -----
  if (wants("termosGarantia") && template.termosRodape) {
    content.push({
      stack: [
        {
          text: template.termosTitulo || "Termos de Garantia, Condições e Custódia da Assistência:",
          fontSize: 6.5,
          bold: true,
          color: "#334155",
          margin: [0, 0, 0, 2]
        },
        ...template.termosRodape.map((t) => ({
          text: t,
          fontSize: 6,
          color: "#64748b",
          lineHeight: 1.3,
          margin: [0, 1, 0, 0]
        }))
      ],
      margin: [0, 10, 0, 0]
    });
  }

  // ----- Assinaturas -----
  if (wants("assinaturas")) {
    const signatureBox = (label: string, sub: string) => ({
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: label, fontSize: 7.5, bold: true, color: "#0f172a", margin: [0, 2, 0, 0] },
                { text: sub, fontSize: 5.5, color: "#64748b", margin: [0, 1, 0, 0] }
              ]
            }
          ]
        ]
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 ? 1 : 0),
        vLineWidth: () => 0,
        hLineColor: () => "#334155",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    });

    content.push({
      columns: [
        signatureBox(template.tecnicoAssinatura, "Assinatura / Carimbo"),
        signatureBox(client?.name || "Assinatura do Cliente", template.clienteAssinatura)
      ],
      columnGap: 40,
      margin: [0, 30, 0, 0]
    });
  }

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN],
    content,
    defaultStyle: { font: FONT, fontSize: 7, color: "#0f172a" }
  };

  // pdfmake 0.2.20 usa callback (getBuffer), não Promise — os tipos do @types/pdfmake
  // miram a 0.3.x, então o método é tipado como any e envolvido em Promise manualmente.
  return await new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDocument = pdfMake.createPdf(docDefinition);
      pdfDocument.getBuffer((buffer: any) => {
        // IMPORTANTE: o build "browser" do pdfmake (pdfmake/build/pdfmake.js)
        // devolve um polyfill de Buffer que o Buffer.isBuffer do Node NÃO
        // reconhece (no bundle esbuild de produção). O Express então serializa
        // o objeto como JSON ({"type":"Buffer","data":[...]}) mantendo o
        // header application/pdf — corrompendo o download. Converte para um
        // Buffer nativo (cópia dos bytes) antes de resolver.
        resolve(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
      });
    } catch (err) {
      reject(err);
    }
  });
}
