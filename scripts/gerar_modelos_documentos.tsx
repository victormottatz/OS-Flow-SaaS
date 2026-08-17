/**
 * Gera os modelos visuais ATUAIS dos documentos do MGV One Hub.
 *
 * Renderiza os componentes reais (DocumentShell + documents.config.ts) com
 * dados de exemplo e produz:
 *   - docs/modelos/01-termo-recebimento.pdf
 *   - docs/modelos/02-orcamento-assistencia.pdf
 *   - docs/modelos/03-recibo-entrega-garantia.pdf
 *   - docs/modelos/preview-modelos.html   (pré-visualização em página única)
 *
 * Como rodar (na raiz do projeto):
 *   ./node_modules/.bin/tsx scripts/gerar_modelos_documentos.tsx
 *
 * O CSS do preview é o CSS compilado do app (dist/assets/*.css), então os
 * documentos aparecem EXATAMENTE como na tela/impressão do sistema.
 */
import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentShell from "../src/components/DocumentShell";
import { DOCUMENT_TEMPLATES } from "../src/config/documents.config";
import { buildDocumentPdf } from "../src/services/pdfService";
import type { OrdemServico } from "../src/types";

const OUT_DIR = path.join(process.cwd(), "docs", "modelos");
const DATA_EMISSAO = "2026-07-30T16:00:00.000-03:00"; // recibo/orçamento: data de entrega (impressão)

// ---------------------------------------------------------------------------
// Dados de exemplo (OS fictícia e realista)
// ---------------------------------------------------------------------------
const sampleOS = {
  id: "os-modelo-0042",
  osNumber: "OS-0042",
  status: "FINALIZADO",
  createdAt: "2026-07-28T09:15:00.000-03:00",
  reportedDefect:
    "Aparelho não liga e o display apresenta linhas verticais; a região do conector de carga esquenta durante o uso.",
  accessoriesLeft:
    "Fonte carregadora 12V, cabo de transmissão de dados e pedal acionador. (NÃO testados na entrada)",
  physicalState:
    "Carcaça com pequenas marcas de uso; tela sem trincas; parafusos originais; etiqueta de patrimônio no painel traseiro.",
  checklistEntrada: [
    { id: "ck1", label: "Liga o aparelho", status: "OK" },
    { id: "ck2", label: "Tela / Display", status: "AVARIA", observacao: "linhas verticais" },
    { id: "ck3", label: "Carregamento", status: "AVARIA", observacao: "conector aquecendo" },
    { id: "ck4", label: "Bateria", status: "OK" },
    { id: "ck5", label: "Áudio / Alarme", status: "OK" },
    { id: "ck6", label: "Conexões externas", status: "N/A" }
  ],
  diagnostic:
    "Falha na fonte de alimentação (CI regulador U4 em curto) e microtrinca na solda do conector de carga.\nAções executadas: substituição do CI regulador, ressoldagem do conector, limpeza ultrassônica da placa principal e teste de estresse de 8h com 100% de aproveitamento.",
  usedParts: [
    {
      name: "CI Regulador de Tensão U4 (reposição)",
      serialNumber: "REG-2210",
      quantity: 1,
      price: 48.9,
      category: "PECA"
    },
    {
      name: "Conector de Carga Tipo C (reposição)",
      serialNumber: "",
      quantity: 1,
      price: 22.0,
      category: "PECA"
    },
    {
      name: "Limpeza ultrassônica da placa principal",
      serialNumber: "",
      quantity: 1,
      price: 60.0,
      category: "SERVICO"
    }
  ],
  laborCost: 189.6,
  discount: 0,
  totalCost: 320.5,
  client: {
    id: "cl-modelo",
    name: "João da Silva",
    cpfCnpj: "123.456.789-00",
    phone: "(16) 99999-1234",
    address: "Rua das Acácias, 123 - Jardim América, Ribeirão Preto - SP"
  },
  device: {
    id: "dv-modelo",
    type: "Ultrassom",
    brand: "Ibramed",
    model: "Sonopulse III",
    serialNumber: "SN-88412-BR",
    description: "Equipamento de fisioterapia com bom estado estético geral."
  }
} as unknown as OrdemServico;

// ---------------------------------------------------------------------------
// Metadados de apresentação por documento (cor do marcador etc.)
// ---------------------------------------------------------------------------
const SHOWCASE = [
  {
    id: "termo",
    arquivo: "01-termo-recebimento.pdf",
    numero: "1",
    titulo: "Termo de Recebimento",
    descricao:
      "Gerado na Abertura da OS (OSManager). Documenta a custódia do equipamento: acessórios, estado físico, checklist de entrada e os termos legais de guarda.",
    cor: "#0d9488",
    dataEmissao: undefined as string | undefined
  },
  {
    id: "orcamento",
    arquivo: "02-orcamento-assistencia.pdf",
    numero: "2",
    titulo: "Orçamento de Assistência Técnica",
    descricao:
      "Gerado quando a OS ainda NÃO está pronta/finalizada (OSList, Kanban, WhatsApp). Apresenta laudo, peças aplicadas e resumo financeiro para aprovação.",
    cor: "#4f46e5",
    dataEmissao: DATA_EMISSAO
  },
  {
    id: "recibo",
    arquivo: "03-recibo-entrega-garantia.pdf",
    numero: "3",
    titulo: "Recibo de Entrega e Garantia",
    descricao:
      "Gerado quando a OS está PRONTO_RETIRADA/FINALIZADO. Mesmo layout do orçamento + os termos de garantia legal de 90 dias (CDC) na entrega.",
    cor: "#059669",
    dataEmissao: DATA_EMISSAO
  }
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1) PDFs reais via pdfService
  console.log("Gerando PDFs em", OUT_DIR);
  for (const item of SHOWCASE) {
    const template = DOCUMENT_TEMPLATES[item.id as keyof typeof DOCUMENT_TEMPLATES];
    const buffer = await buildDocumentPdf(template, sampleOS, item.dataEmissao);
    const dest = path.join(OUT_DIR, item.arquivo);
    fs.writeFileSync(dest, buffer);
    console.log(`  ✓ ${item.arquivo} (${buffer.length} bytes)`);
  }

  // 2) Preview HTML — SSR dos componentes reais
  const cssFiles = fs
    .readdirSync(path.join(process.cwd(), "dist", "assets"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(process.cwd(), "dist", "assets", f));
  if (cssFiles.length === 0) {
    console.error("ERRO: nenhum CSS compilado em dist/assets — rode 'npm run build' antes.");
    process.exit(1);
  }
  const appCss = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  // Logo: o SSR do AppLogo cai no fallback PNG (sem document no Node) — embutimos como data URI.
  const logoPng = fs.readFileSync(path.join(process.cwd(), "public", "logos", "LOGO V3.0 (2).png"));
  const logoDataUri = `data:image/png;base64,${logoPng.toString("base64")}`;

  const secoesHtml = SHOWCASE.map((item) => {
    const template = DOCUMENT_TEMPLATES[item.id as keyof typeof DOCUMENT_TEMPLATES];
    const docHtml = renderToStaticMarkup(
      createElement(DocumentShell, {
        template,
        os: sampleOS,
        dataEmissao: item.dataEmissao
      })
    ).replaceAll('/logos/LOGO V3.0 (2).png', logoDataUri);

    const chips = template.secoes
      .map((s) => `<span class="chip">${s}</span>`)
      .join("");

    return `
    <section class="pagina">
      <div class="doc-label no-print">
        <span class="dot" style="background:${item.cor}"></span>
        <div>
          <h2>${item.numero}. ${item.titulo}</h2>
          <p>${item.descricao}</p>
        </div>
        <a class="pdf-link" href="${item.arquivo}" download>Baixar PDF</a>
      </div>
      <div class="chip-row no-print"><span class="chip-label">Seções do modelo:</span>${chips}</div>
      ${docHtml}
    </section>`;
  }).join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Modelos de Documentos — MGV One Hub</title>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
<style>
${appCss}
/* ---- CSS do showcase (fora do app) ---- */
:root { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
body { background: #eef2f7; margin: 0; }
.showcase-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: 14px; padding: 12px 28px; background: #0f172a; color: #fff; box-shadow: 0 2px 14px rgba(2,6,23,.28); }
.showcase-header img { height: 32px; border-radius: 6px; }
.showcase-header h1 { font-size: 16px; margin: 0; letter-spacing: .2px; }
.showcase-header .sub { font-size: 12px; color: #94a3b8; margin: 2px 0 0; }
.showcase-header .print-btn { margin-left: auto; background: #6366f1; border: 0; color: #fff; font-weight: 700; font-size: 13px; padding: 9px 18px; border-radius: 10px; cursor: pointer; }
.showcase-header .print-btn:hover { background: #4f46e5; }
.showcase-intro { max-width: 960px; margin: 26px auto 4px; padding: 0 24px; font-size: 13.5px; color: #475569; line-height: 1.65; }
.showcase-intro strong { color: #0f172a; }
.doc-label { display: flex; align-items: center; gap: 14px; max-width: 960px; margin: 38px auto 12px; padding: 0 24px; }
.doc-label .dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(0,0,0,.06); flex: none; }
.doc-label h2 { margin: 0; font-size: 16px; color: #0f172a; }
.doc-label p { margin: 3px 0 0; font-size: 12.5px; color: #64748b; max-width: 620px; }
.pdf-link { margin-left: auto; text-decoration: none; font-size: 12px; font-weight: 700; color: #4f46e5; border: 1px solid #c7d2fe; background: #eef2ff; padding: 7px 15px; border-radius: 999px; white-space: nowrap; }
.pdf-link:hover { background: #e0e7ff; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; max-width: 960px; margin: 0 auto 14px; padding: 0 24px; }
.chip-label { font-size: 11px; font-weight: 700; color: #334155; margin-right: 2px; padding-top: 4px; }
.chip { font-size: 10.5px; font-weight: 600; color: #334155; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 3px 10px; border-radius: 999px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.footer-note { max-width: 960px; margin: 44px auto 70px; padding: 18px 24px; font-size: 12.5px; color: #475569; line-height: 1.75; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.footer-note code { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1px 6px; font-size: 11.5px; }
@media print {
  body { background: #fff; }
  .showcase-header, .showcase-intro, .doc-label, .chip-row, .footer-note { display: none !important; }
  .pagina { break-after: page; }
  .pagina:last-child { break-after: auto; }
}
</style>
</head>
<body>
  <header class="showcase-header no-print">
    <img src="${logoDataUri}" alt="MGV One Hub" />
    <div>
      <h1>Modelos de Documentos — MGV One Hub</h1>
      <p class="sub">Renderizados pelos componentes reais (DocumentShell + documents.config.ts) — sem mockup manual</p>
    </div>
    <button class="print-btn" onclick="window.print()">🖨 Imprimir todos</button>
  </header>

  <main class="showcase-intro no-print">
    <p>
      Estes são os <strong>3 documentos</strong> que o MGV One Hub emite hoje — todos gerados a partir do mesmo
      registro central em <strong>src/config/documents.config.ts</strong> e renderizados pelo
      <strong>DocumentShell</strong> (tela e impressão) e pelo <strong>pdfService</strong> (PDF real no servidor).
      Use o botão <em>Imprimir todos</em> para ver o comportamento de impressão (cada documento ocupa uma página).
    </p>
  </main>

  ${secoesHtml}

  <footer class="footer-note no-print">
    <strong>Como personalizar:</strong> edite a entrada correspondente em <code>src/config/documents.config.ts</code>
    (título, cor, seções, termos de garantia, assinaturas) — a tela e o PDF mudam juntos, sem tocar em JSX.
    Para adicionar um documento novo, crie a entrada no registro e use
    <code>&lt;DocumentShell template={...} os={os} /&gt;</code>.
    <br />Regenerar estes modelos: <code>./node_modules/.bin/tsx scripts/gerar_modelos_documentos.tsx</code>
  </footer>
</body>
</html>`;

  const htmlDest = path.join(OUT_DIR, "preview-modelos.html");
  fs.writeFileSync(htmlDest, html);
  console.log(`  ✓ ${path.relative(process.cwd(), htmlDest)} (${html.length} chars)`);
  console.log("\nConcluído! Abra o preview-modelos.html no navegador ou os PDFs gerados.");
}

main().catch((err) => {
  console.error("ERRO ao gerar modelos:", err);
  process.exit(1);
});
