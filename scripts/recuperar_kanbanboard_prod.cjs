/**
 * Recupera src/components/KanbanBoard.tsx do PROD (truncado pela extração do
 * bloco imprimível — a extração consumiu até o fim do arquivo).
 *
 * A = topo INTACTO do arquivo atual de PROD até `{activePrintOS && (` do bloco
 *     (preserva TODO o trabalho de tags e estilos de card de PROD);
 * B = bloco <DocumentShell> migrado + fechamento `)}`;
 * C = cauda do TESTE a partir do fim do bloco imprimível (modais de
 *     encerramento/pagamento/fiscal/onboarding — trabalho compartilhado,
 *     idêntico entre os checkouts; validado via diff TESTE vs PROD).
 */
const fs = require("fs");
const path = require("path");

const PROD = "D:/HD/MGV/MGV_2026/MGV-Assistência-Técnica";
const FILE = path.join(PROD, "src", "components", "KanbanBoard.tsx");
const TESTE = path.join(process.cwd(), "src", "components", "KanbanBoard.tsx");

const currentRaw = fs.readFileSync(FILE, "utf8");
const crlf = currentRaw.includes("\r\n");
const current = currentRaw.replace(/\r\n/g, "\n");
const teste = fs.readFileSync(TESTE, "utf8").replace(/\r\n/g, "\n");

// --- A: topo intacto de PROD até o `{activePrintOS && (` do bloco imprimível ---
const anchor = "      {/* Printable Exit Receipt Template */}";
const anchorIdx = current.lastIndexOf(anchor);
if (anchorIdx === -1) throw new Error("âncora do bloco imprimível não encontrada no PROD atual");
const conditionalIdx = current.indexOf("{activePrintOS && (", anchorIdx);
if (conditionalIdx === -1) throw new Error("`{activePrintOS && (` não encontrado no PROD atual");
const A = current.slice(0, conditionalIdx);

// --- B: DocumentShell migrado + fechamento ---
const B =
  "{activePrintOS && (\n" +
  "        <DocumentShell\n" +
  "          template={resolveTemplateForOS(activePrintOS)}\n" +
  "          os={activePrintOS}\n" +
  "          hidden\n" +
  "          dataEmissao={new Date().toISOString()}\n" +
  "        />\n" +
  "      )}";

// --- C: cauda do TESTE (modais compartilhados) a partir do fim do bloco imprimível ---
const testeAnchor = "{/* Printable Exit Receipt / Budget Template";
const testeAnchorIdx = teste.indexOf(testeAnchor);
if (testeAnchorIdx === -1) throw new Error("âncora do bloco imprimível não encontrada no TESTE");
const testeConditional = teste.indexOf("{activePrintOS && (", testeAnchorIdx);
// ancorar no `/>` do DocumentShell (self-closing) — o `)}` seguinte é o fechamento real do condicional
const dsEnd = teste.indexOf("/>", testeConditional);
const closeParen = teste.indexOf(")}", dsEnd);
if (closeParen === -1) throw new Error("fechamento do condicional não encontrado no TESTE");
const C = teste.slice(closeParen + 2).replace(/^\n+/, "");

const recovered = A + B + "\n\n" + C;
fs.writeFileSync(FILE, crlf ? recovered.replace(/\n/g, "\r\n") : recovered, "utf8");

console.log("Reconstruído:", recovered.split("\n").length, "linhas");
console.log("  A (topo PROD intacto):", A.split("\n").length, "linhas");
console.log("  C (cauda modais TESTE):", C.split("\n").length, "linhas");
console.log("\nPróximo: tsc --noEmit + revisar diff TESTE vs PROD-reconstruído.");
