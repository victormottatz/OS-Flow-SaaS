import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();

// Função simples para normalizar nomes para batimento resiliente
function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, "") // remove espaços e caracteres especiais
    .trim();
}

async function run() {
  console.log("=== INICIANDO IMPORTAÇÃO DE DADOS FISCAIS DAS PEÇAS ===");
  const xlsxPath = "D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\docs\\Nova pasta (3)\\ITENS.xlsx";

  let excelData: any[] = [];
  try {
    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    excelData = XLSX.utils.sheet_to_json(sheet);
    console.log(`-> Excel carregado com sucesso. Total de registros: ${excelData.length}`);
  } catch (err: any) {
    console.error("Erro ao abrir ou ler arquivo Excel:", err.message);
    return;
  }

  // Carrega todas as peças do banco de dados do Prisma (Produção)
  console.log("-> Carregando peças ativas do banco...");
  const dbParts = await prisma.part.findMany({
    where: { deletedAt: null }
  });
  console.log(`-> Total de peças no banco: ${dbParts.length}`);

  // Criar mapas do Excel para buscas de O(1) rápidas
  const mapByNumero = new Map<string, any>();
  const mapByCodigo = new Map<string, any>();
  const mapByName = new Map<string, any>();

  excelData.forEach(row => {
    if (row.NUMERO) mapByNumero.set(String(row.NUMERO).trim(), row);
    if (row.CODIGO) mapByCodigo.set(String(row.CODIGO).trim(), row);
    if (row.NOME) mapByName.set(normalizeName(row.NOME), row);
  });

  let updatedCount = 0;
  let notFoundCount = 0;

  console.log("-> Cruzando e atualizando peças...");

  for (const part of dbParts) {
    let matchedRow: any = null;

    // 1. Tenta cruzar pelo código (Número do Fabricante/Número no SH)
    const cleanCode = part.code.trim();
    if (mapByNumero.has(cleanCode)) {
      matchedRow = mapByNumero.get(cleanCode);
    } else if (mapByCodigo.has(cleanCode)) {
      matchedRow = mapByCodigo.get(cleanCode);
    } else {
      // 2. Tenta cruzar pelo Nome normalizado
      const normDbName = normalizeName(part.name);
      if (mapByName.has(normDbName)) {
        matchedRow = mapByName.get(normDbName);
      }
    }

    if (matchedRow) {
      // Formata e sanitiza o NCM (geralmente vem sem ponto ou com ponto)
      const rawNcm = matchedRow.NC_MERCOSUL ? String(matchedRow.NC_MERCOSUL).replace(/\D/g, "") : "";
      
      // Sanitizações e Fallbacks
      const ncm = rawNcm.length === 8 ? rawNcm : part.ncm; // Mantém o atual se o do excel for inválido
      const cstOrigem = matchedRow.C_CST_O !== undefined ? String(matchedRow.C_CST_O).trim() : undefined;
      const cstIcms = matchedRow.C_CST !== undefined ? String(matchedRow.C_CST).trim() : undefined;
      
      const cfopIntra = matchedRow.CFOP_INUF !== undefined ? String(matchedRow.CFOP_INUF).trim() : undefined;
      const cfopInter = matchedRow.CFOP_OUTUF !== undefined ? String(matchedRow.CFOP_OUTUF).trim() : undefined;
      
      const requiresSerial = matchedRow.USA_SERIAL === true || matchedRow.USA_SERIAL === "S" || matchedRow.USA_SERIAL === 1;

      // Executa update no Prisma
      await prisma.part.update({
        where: { id: part.id },
        data: {
          ncm: ncm || undefined,
          cstOrigem: cstOrigem || undefined,
          cstIcms: cstIcms || undefined,
          cfopIntraEstadual: cfopIntra || undefined,
          cfopInterEstadual: cfopInter || undefined,
          requiresSerial: requiresSerial
        }
      });
      updatedCount++;
    } else {
      notFoundCount++;
    }
  }

  console.log("\n=== RESULTADO DA IMPORTAÇÃO FISCAL ===");
  console.log(`- Peças ativas atualizadas com dados fiscais: ${updatedCount}`);
  console.log(`- Peças não localizadas na planilha de itens: ${notFoundCount}`);
  console.log("======================================");

  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Erro crítico durante a importação fiscal:", err);
  prisma.$disconnect();
});
