/**
 * Porta o sistema de documentos (DocumentShell + documents.config + pdfService)
 * do workspace TESTE para o checkout de PRODUÇÃO (porta 3000), aplicando
 * edições CIRÚRGICAS que preservam o trabalho próprio da produção
 * (feature de tags, rotas tags/suppliers/custom-fields, etc.).
 *
 * Uso:
 *   node scripts/portar_documentos_prod.cjs
 *
 * O script aborta (exit 1) se qualquer transformação não encontrar o alvo
 * esperado — nada é aplicado parcialmente sem aviso.
 */
const fs = require("fs");
const path = require("path");

const PROD = "D:/HD/MGV/MGV_2026/MGV-Assistência-Técnica";
const SRC = path.join(PROD, "src");
const failures = [];
let log = [];

const ok = (msg) => log.push("  \u2713 " + msg);
const fail = (msg) => failures.push(msg);

// ---------- helpers ----------
function readText(file) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  return { text: raw.replace(/\r\n/g, "\n"), crlf };
}

function writeText(file, text, crlf) {
  const out = crlf ? text.replace(/\n/g, "\r\n") : text;
  fs.writeFileSync(file, out, "utf8");
}

/** Insere os imports do sistema de documentos após uma âncora; idempotente e tolerante (o AppLogo pode ter sido removido depois). */
function ensureDocImports(file, anchor, importsBlock, desc) {
  const { text, crlf } = readText(file);
  if (text.includes('import DocumentShell from "./DocumentShell";')) {
    log.push(`  - ${path.basename(file)} :: ${desc} — já aplicado (pulado)`);
    return;
  }
  if (!text.includes(anchor)) {
    return fail(`${file} :: âncora não encontrada: ${desc}`);
  }
  writeText(file, text.replace(anchor, anchor + "\n" + importsBlock), crlf);
  ok(`${path.basename(file)} :: ${desc}`);
}

/** Substitui a 1ª ocorrência de `before` por `after`; falha se não achar. */
function replaceOnce(file, before, after, desc) {
  const { text, crlf } = readText(file);
  if (text.includes(after)) {
    log.push(`  - ${path.basename(file)} :: ${desc} — já aplicado (pulado)`);
    return;
  }
  if (!text.includes(before)) {
    fail(`${file} :: alvo não encontrado: ${desc}`);
    return;
  }
  if (text.indexOf(before) !== text.lastIndexOf(before)) {
    // múltiplas ocorrências: substitui só a primeira e avisa
    log.push(`  \u26a0 ${file} :: ${desc} — múltiplas ocorrências (substituí a 1ª)`);
  }
  const out = text.replace(before, after);
  writeText(file, out, crlf);
  ok(`${path.basename(file)} :: ${desc}`);
}

/** Remove região entre dois marcadores (inclusive + linha em branco seguinte). Idempotente. */
function removeRegion(file, startMarker, endMarker, desc) {
  const { text, crlf } = readText(file);
  const start = text.indexOf(startMarker);
  if (start === -1) {
    log.push(`  - ${path.basename(file)} :: ${desc} — já removido (pulado)`);
    return;
  }
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return fail(`${file} :: fim não encontrado: ${desc}`);
  let cutEnd = end + endMarker.length;
  if (text.slice(cutEnd, cutEnd + 1) === "\n") cutEnd += 1;
  const out = text.slice(0, start) + text.slice(cutEnd);
  writeText(file, out, crlf);
  ok(`${path.basename(file)} :: ${desc}`);
}

/**
 * Extrai um elemento JSX `<div ...>...</div>` (balanceado) a partir de um
 * marcador interno (ex: `id="printable-termo"`). Retorna {start, end, text}
 * cobrindo do `<div` que contém o marcador até o `</div>` correspondente.
 */
function extractDivElement(content, startMarker, file, desc) {
  const markIdx = content.indexOf(startMarker);
  if (markIdx === -1) {
    fail(`${file} :: marcador do bloco não encontrado: ${desc}`);
    return null;
  }
  const divStart = content.lastIndexOf("<div", markIdx);
  let i = divStart;
  let depth = 0;
  while (i < content.length) {
    const open = content.indexOf("<div", i);
    const close = content.indexOf("</div>", i);
    if (open === -1 && close === -1) break;
    if (open !== -1 && (close === -1 || open < close)) {
      // tag de abertura: detecta se é auto-fechada (<div ... />) — JSX permite
      const tagEnd = content.indexOf(">", open + 4);
      const selfClosing = tagEnd !== -1 && content[tagEnd - 1] === "/";
      if (!selfClosing) depth += 1;
      i = (tagEnd === -1 ? open + 4 : tagEnd + 1);
    } else {
      depth -= 1;
      i = close + 6;
      if (depth === 0) {
        return { start: divStart, end: i, text: content.slice(divStart, i) };
      }
    }
  }
  fail(`${file} :: bloco <div> não fechado: ${desc}`);
  return null;
}

/** Substitui um bloco <div id="printable-*">...</div> por `after`. Idempotente. */
function replacePrintableBlock(file, idMarker, after, landmark, desc) {
  const { text, crlf } = readText(file);
  if (!text.includes(idMarker)) {
    log.push(`  - ${path.basename(file)} :: ${desc} — já substituído (pulado)`);
    return;
  }
  const el = extractDivElement(text, idMarker, file, desc);
  if (!el) return;
  if (!el.text.includes(landmark)) {
    fail(`${file} :: bloco extraído não contém '${landmark}' — conferir extração`);
    return;
  }
  const out = text.slice(0, el.start) + after + text.slice(el.end);
  writeText(file, out, crlf);
  ok(`${path.basename(file)} :: ${desc} (bloco substituído por DocumentShell)`);
}

/** Remove import de AppLogo se ficou órfão (nenhuma outra ocorrência). */
function dropOrphanAppLogo(file) {
  const { text, crlf } = readText(file);
  const importLine = 'import AppLogo from "./AppLogo";';
  if (!text.includes(importLine)) return; // não existe → ok
  const withoutImport = text.split(importLine).join("");
  if (withoutImport.includes("AppLogo")) {
    log.push(`  \u26a0 ${path.basename(file)} :: AppLogo ainda usado em outro lugar — import mantido`);
    return;
  }
  writeText(file, withoutImport, crlf);
  ok(`${path.basename(file)} :: import AppLogo órfão removido`);
}

// ---------- 1) arquivos NOVOS ----------
const NEW_FILES = [
  "src/config/documents.config.ts",
  "src/components/DocumentShell.tsx",
  "src/hooks/usePrintDocument.ts",
  "src/utils/downloadDocument.ts",
  "src/services/pdfService.ts",
  "src/routes/documents.routes.ts",
  "scripts/gerar_modelos_documentos.tsx"
];
console.log("== 1) Copiando arquivos novos ==");
for (const rel of NEW_FILES) {
  const from = path.join(process.cwd(), rel);
  const to = path.join(PROD, rel);
  if (!fs.existsSync(from)) {
    fail(`origem não existe: ${from}`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  ok(`copiado ${rel}`);
}

// ---------- 2) routes/index.ts: registrar /documents (mantendo tags/suppliers/custom-fields) ----------
console.log("\n== 2) routes/index.ts ==");
{
  const file = path.join(SRC, "routes", "index.ts");
  replaceOnce(
    file,
    'import customFieldsRoutes from "./customFields.routes";',
    'import customFieldsRoutes from "./customFields.routes";\nimport documentsRoutes from "./documents.routes";',
    "import documentsRoutes"
  );
  replaceOnce(
    file,
    'router.use("/custom-fields", customFieldsRoutes);',
    'router.use("/custom-fields", customFieldsRoutes);\nrouter.use("/documents", documentsRoutes);',
    "registrar rota /documents"
  );
}

// ---------- 3) index.css: remover regra morta printing-recibo ----------
console.log("\n== 3) index.css ==");
{
  const file = path.join(SRC, "index.css");
  const { text, crlf } = readText(file);
  const deadRule =
    "  body.printing-recibo *:not(:has(#printable-recibo)):not(#printable-recibo):not(#printable-recibo *) {\n    display: none !important;\n  }\n\n";
  if (text.includes(deadRule)) {
    writeText(file, text.replace(deadRule, ""), crlf);
    ok("index.css :: regra morta printing-recibo removida");
  } else {
    log.push("  - index.css :: regra printing-recibo não encontrada (pode já ter sido removida)");
  }
}

// ---------- 4) OSManager.tsx ----------
console.log("\n== 4) OSManager.tsx ==");
{
  const file = path.join(SRC, "components", "OSManager.tsx");
  ensureDocImports(
    file,
    'import TagSelector from "./TagSelector";',
    'import { usePrintDocument } from "../hooks/usePrintDocument";\nimport { DOCUMENT_TEMPLATES } from "../config/documents.config";\nimport { downloadDocumentPdf } from "../utils/downloadDocument";\nimport DocumentShell from "./DocumentShell";',
    "imports do sistema de documentos"
  );
  replaceOnce(
    file,
    `  const handlePrint = () => {
    window.print();
  };`,
    `  const printDocument = usePrintDocument();

  const handlePrint = async () => {
    if (!createdOS) return;
    const template = DOCUMENT_TEMPLATES.termo;
    // PDF real gerado no servidor; fallback para a impressão via navegador se falhar.
    const ok = await downloadDocumentPdf(
      template.id,
      createdOS.id,
      \`\${template.nomeArquivo}-\${createdOS.osNumber}\`
    );
    if (!ok) printDocument(\`\${template.nomeArquivo}-\${createdOS.osNumber}\`);
  };`,
    "handler handlePrint com PDF real + fallback"
  );
  removeRegion(
    file,
    "{/* Printable Area overrides shown inside modal / container */}",
    "</style>",
    "remoção do <style> inline de impressão"
  );
  replacePrintableBlock(
    file,
    'id="printable-termo"',
    `          {/* Documento imprimível: Termo de Recebimento (config central: src/config/documents.config.ts) */}
          {(() => {
            const termoClient = clients.find((c) => c.id === createdOS.clientId);
            const termoDevice = termoClient?.devices?.find((d) => d.id === createdOS.deviceId);
            return (
              <DocumentShell
                template={DOCUMENT_TEMPLATES.termo}
                os={createdOS}
                client={termoClient}
                device={termoDevice}
              />
            );
          })()}`,
    "TERMO DE RECEBIMENTO",
    "bloco #printable-termo → DocumentShell"
  );
  dropOrphanAppLogo(file);
}

// ---------- 5) OSList.tsx ----------
console.log("\n== 5) OSList.tsx ==");
{
  const file = path.join(SRC, "components", "OSList.tsx");
  ensureDocImports(
    file,
    'import AppLogo from "./AppLogo";',
    'import { usePrintDocument } from "../hooks/usePrintDocument";\nimport { resolveTemplateForOS } from "../config/documents.config";\nimport { downloadDocumentPdf } from "../utils/downloadDocument";\nimport DocumentShell from "./DocumentShell";',
    "imports do sistema de documentos"
  );
  replaceOnce(
    file,
    `  const handlePrintReceipt = (os: OrdemServico) => {
    setActivePrintOS(os);
    document.body.classList.add("printing-recibo");
    const cleanup = () => {
      document.body.classList.remove("printing-recibo");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
    }, 150);
  };`,
    `  const printDocument = usePrintDocument();

  const handlePrintReceipt = async (os: OrdemServico) => {
    const template = resolveTemplateForOS(os);
    // PDF real gerado no servidor; fallback para a impressão via navegador se falhar.
    const ok = await downloadDocumentPdf(template.id, os.id, \`\${template.nomeArquivo}-\${os.osNumber}\`);
    if (!ok) {
      setActivePrintOS(os);
      printDocument(\`\${template.nomeArquivo}-\${os.osNumber}\`);
    }
  };`,
    "handler handlePrintReceipt com PDF real + fallback"
  );
  removeRegion(
    file,
    "{/* Print styles override */}",
    "</style>",
    "remoção do <style> inline de impressão"
  );
  replacePrintableBlock(
    file,
    'id="printable-recibo"',
    `        <DocumentShell
          template={resolveTemplateForOS(activePrintOS)}
          os={activePrintOS}
          hidden
        />`,
    "RECIBO",
    "bloco #printable-recibo → DocumentShell"
  );
  dropOrphanAppLogo(file);
}

// ---------- 6) KanbanBoard.tsx ----------
console.log("\n== 6) KanbanBoard.tsx ==");
{
  const file = path.join(SRC, "components", "KanbanBoard.tsx");
  ensureDocImports(
    file,
    'import AppLogo from "./AppLogo";',
    'import DocumentShell from "./DocumentShell";\nimport { resolveTemplateForOS } from "../config/documents.config";\nimport { usePrintDocument } from "../hooks/usePrintDocument";\nimport { downloadDocumentPdf } from "../utils/downloadDocument";',
    "imports do sistema de documentos"
  );
  replaceOnce(
    file,
    `  const handlePrintRecibo = (os: OrdemServico) => {
    setActivePrintOS(os);
    document.body.classList.add("printing-recibo");
    const cleanup = () => {
      document.body.classList.remove("printing-recibo");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
    }, 150);
  };`,
    `  const printDocument = usePrintDocument();

  const handlePrintRecibo = async (os: OrdemServico) => {
    const template = resolveTemplateForOS(os);
    // PDF real gerado no servidor (data de emissão = agora, como no recibo impresso);
    // fallback para a impressão via navegador se o servidor falhar.
    const ok = await downloadDocumentPdf(
      template.id,
      os.id,
      \`\${template.nomeArquivo}-\${os.osNumber}\`,
      new Date().toISOString()
    );
    if (!ok) {
      setActivePrintOS(os);
      printDocument(\`\${template.nomeArquivo}-\${os.osNumber}\`);
    }
  };`,
    "handler handlePrintRecibo com PDF real + fallback"
  );
  removeRegion(
    file,
    "{/* Print Overrides styling */}",
    "</style>",
    "remoção do <style> inline de impressão"
  );
  replacePrintableBlock(
    file,
    'id="printable-recibo"',
    `        <DocumentShell
          template={resolveTemplateForOS(activePrintOS)}
          os={activePrintOS}
          hidden
          dataEmissao={new Date().toISOString()}
        />`,
    "RECIBO DE ENTREGA",
    "bloco #printable-recibo → DocumentShell"
  );
  dropOrphanAppLogo(file);
}

// ---------- 7) OSWhatsAppPanel.tsx (cópia integral — diff era só do sistema de documentos) ----------
console.log("\n== 7) OSWhatsAppPanel.tsx ==");
{
  const from = path.join(process.cwd(), "src", "components", "OSWhatsAppPanel.tsx");
  const to = path.join(SRC, "components", "OSWhatsAppPanel.tsx");
  fs.copyFileSync(from, to);
  ok("copiado (diff era apenas o sistema de documentos)");
}

// ---------- 8) package.json: pdfmake ----------
console.log("\n== 8) package.json ==");
{
  const file = path.join(PROD, "package.json");
  const { text, crlf } = readText(file);
  const pkg = JSON.parse(text);
  if (pkg.dependencies && !pkg.dependencies.pdfmake) {
    pkg.dependencies.pdfmake = "^0.2.20";
  }
  if (pkg.devDependencies && !pkg.devDependencies["@types/pdfmake"]) {
    pkg.devDependencies["@types/pdfmake"] = "^0.3.3";
  }
  const sorted = {};
  for (const k of Object.keys(pkg.dependencies).sort()) sorted[k] = pkg.dependencies[k];
  pkg.dependencies = sorted;
  const sortedDev = {};
  for (const k of Object.keys(pkg.devDependencies).sort()) sortedDev[k] = pkg.devDependencies[k];
  pkg.devDependencies = sortedDev;
  writeText(file, JSON.stringify(pkg, null, 2) + "\n", crlf);
  ok("pdfmake ^0.2.20 (deps) + @types/pdfmake ^0.3.3 (devDeps) adicionados");
}

// ---------- relatório ----------
console.log("\n========== RELATÓRIO ==========");
console.log(log.join("\n"));
if (failures.length) {
  console.error("\nFALHAS:");
  failures.forEach((f) => console.error("  ✗ " + f));
  console.error("\nNenhuma gravação parcial insegura — corrija as falhas acima e reexecute.");
  process.exit(1);
}
console.log("\nPortabilidade concluída com sucesso. Próximos passos: npm install (pdfmake), tsc --noEmit e npm run build no PROD.");
