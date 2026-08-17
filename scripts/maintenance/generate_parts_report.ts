import { PrismaClient } from "@prisma/client";
import * as fs from "fs/promises";

const prisma = new PrismaClient();

async function run() {
  console.log("Iniciando geração de relatório de peças sem NCM...");

  const parts = await prisma.part.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" }
  });

  const pendingParts = parts.filter(p => {
    const cleanNcm = p.ncm ? p.ncm.replace(/\D/g, "") : "";
    return !p.ncm || cleanNcm.length !== 8;
  });

  const reportPath = "C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\2facd323-6484-40dc-878a-9e4ca097cc0f\\pecas_sem_dados_fiscais.md";

  let md = `# Relatório de Peças do Estoque sem Dados Fiscais (Sem NCM)\n\n`;
  md += `Este documento lista todas as **${pendingParts.length} peças** ativas no estoque do MGV que não possuem o código **NCM de 8 dígitos** preenchido (ou possuem NCM inválido). \n\n`;
  md += `> [!TIP]\n`;
  md += `> O colaborador **Otávio** pode acessar a nova aba **"Painel Fiscal"** na barra lateral do sistema de produção e preencher esses NCMs de forma sequencial rápida (estilo Excel) direto pela tabela.\n\n`;
  md += `| # | Código da Peça | Nome do Produto / Peça | NCM Atual | Custo (R$) | Preço Venda (R$) |\n`;
  md += `|---|---|---|---|---|---|\n`;

  pendingParts.forEach((p, idx) => {
    md += `| ${idx + 1} | \`${p.code}\` | ${p.name} | \`${p.ncm || "Vazio"}\` | R$ ${p.cost.toFixed(2)} | R$ ${p.price.toFixed(2)} |\n`;
  });

  await fs.writeFile(reportPath, md, "utf-8");
  console.log(`Relatório de ${pendingParts.length} peças gerado com sucesso em: ${reportPath}`);

  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Erro ao gerar relatório:", err);
  prisma.$disconnect();
});
