import { PrismaClient } from "@prisma/client";
import { isValidCpfOrCnpj } from "../../src/utils/cpfCnpjValidator";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();

async function diagnose() {
  console.log("=== DIAGNÓSTICO FISCAL MGV ===");

  // 1. Verificar Feature Flag
  console.log("\n1. Verificando Feature Flags...");
  const flag = await prisma.featureFlag.findUnique({
    where: { key: "FISCAL_NFE_EMISSION" }
  });
  if (flag) {
    console.log(`   - FISCAL_NFE_EMISSION: ${flag.value ? "ATIVADA (OK)" : "DESATIVADA"}`);
  }

  // 2. Verificar Peças sem NCM ou NCM Inválido
  console.log("\n2. Auditando Peças no Estoque...");
  const parts = await prisma.part.findMany({
    where: { deletedAt: null }
  });

  const badParts = parts.filter(p => {
    const cleanNcm = p.ncm ? p.ncm.replace(/\D/g, "") : "";
    return !p.ncm || cleanNcm.length !== 8;
  });

  console.log(`   - Total de peças ativas no estoque: ${parts.length}`);
  console.log(`   - Peças com NCM ausente ou inválido: ${badParts.length}`);

  // 3. Verificar Clientes com Dados Incompletos e gerar Relatório Markdown
  console.log("\n3. Auditando Clientes...");
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" }
  });

  const badClients: any[] = [];

  clients.forEach(c => {
    const docVal = isValidCpfOrCnpj(c.cpfCnpj);
    const hasAddress = c.address && c.address.trim() !== "";
    const hasCity = c.city && c.city.trim() !== "";
    const hasState = c.state && c.state.trim() !== "" && c.state.trim().length === 2;
    const hasZip = c.zipCode && c.zipCode.trim() !== "";

    if (!docVal.valid || !hasAddress || !hasCity || !hasState || !hasZip) {
      const reasons: string[] = [];
      if (!docVal.valid) reasons.push("Documento Inválido/Incompleto");
      if (!hasAddress) reasons.push("Falta Endereço");
      if (!hasCity) reasons.push("Falta Cidade");
      if (!hasState) reasons.push("Falta UF (Estado)");
      if (!hasZip) reasons.push("Falta CEP");

      badClients.push({
        id: c.id,
        name: c.name,
        doc: c.cpfCnpj || "Vazio",
        phone: c.phone || "Não informado",
        reasons: reasons.join(", ")
      });
    }
  });

  console.log(`   - Clientes com pendências cadastrais fiscais: ${badClients.length}`);

  // Gerar o Relatório Markdown na pasta de artefatos da conversa
  const reportPath = "C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\2facd323-6484-40dc-878a-9e4ca097cc0f\\clientes_pendentes_fiscal.md";
  
  let mdContent = `# Relatório de Clientes com Pendências Cadastrais Fiscais (Legado)\n\n`;
  mdContent += `Este documento lista todos os **${badClients.length} clientes** ativos que possuem alguma inconsistência cadastral (como CPF/CNPJ matematicamente inválido, endereço, cidade, UF ou CEP ausente). \n\n`;
  mdContent += `> [!IMPORTANT]\n`;
  mdContent += `> A recepção não precisa corrigir todos de uma vez. Quando o cliente abrir uma nova Ordem de Serviço, o validador do sistema alertará no Kanban quais dados estão ausentes, permitindo a correção na hora do checkout.\n\n`;
  mdContent += `| # | Nome do Cliente | Documento (CPF/CNPJ) | Telefone | Pendências Encontradas |\n`;
  mdContent += `|---|---|---|---|---|\n`;

  badClients.forEach((c, idx) => {
    mdContent += `| ${idx + 1} | ${c.name} | \`${c.doc}\` | ${c.phone} | <span style="color:#ba1a1a;font-weight:semibold;">${c.reasons}</span> |\n`;
  });

  await fs.writeFile(reportPath, mdContent, "utf-8");
  console.log(`   - Relatório gravado com sucesso em: ${reportPath}`);

  await prisma.$disconnect();
}

diagnose().catch(err => {
  console.error("Erro ao rodar diagnóstico:", err);
  prisma.$disconnect();
});
