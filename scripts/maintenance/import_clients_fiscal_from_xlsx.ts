import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();

// Normalizar nomes para batimento resiliente
function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, "") // remove espaços e caracteres especiais
    .trim();
}

// Sanitizar CPF/CNPJ (apenas dígitos)
function cleanDoc(val: string): string {
  if (!val) return "";
  return val.replace(/\D/g, "");
}

// Sanitizar CEP (apenas dígitos, com zeros à esquerda se necessário)
function cleanCep(val: string): string {
  if (!val) return "";
  const cleaned = val.replace(/\D/g, "");
  if (cleaned.length === 8) return cleaned;
  if (cleaned.length === 7) return "0" + cleaned; // cep com 7 dígitos (zero à esquerda cortado)
  return cleaned;
}

async function run() {
  console.log("=== INICIANDO ATUALIZAÇÃO FISCAL DE CLIENTES (CEP/CIDADE/UF) ===");
  const xlsxPath = "D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\docs\\Nova pasta (3)\\CLIENTES.xlsx";

  let excelData: any[] = [];
  try {
    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    excelData = XLSX.utils.sheet_to_json(sheet);
    console.log(`-> Excel carregado. Total de registros: ${excelData.length}`);
  } catch (err: any) {
    console.error("Erro ao ler o arquivo Excel:", err.message);
    return;
  }

  // Carrega clientes do banco de dados (Prisma Produção)
  console.log("-> Carregando clientes ativos do banco...");
  const dbClients = await prisma.client.findMany({
    where: { deletedAt: null }
  });
  console.log(`-> Total de clientes no banco: ${dbClients.length}`);

  // Criar mapas rápidos do Excel
  const mapByDoc = new Map<string, any>();
  const mapByName = new Map<string, any>();

  excelData.forEach(row => {
    const doc = cleanDoc(row.CPF_CNPJ);
    if (doc && doc.length > 0) mapByDoc.set(doc, row);
    if (row.NOME) mapByName.set(normalizeName(row.NOME), row);
  });

  let updatedCount = 0;
  let notFoundCount = 0;

  console.log("-> Cruzando dados e atualizando CEP, Cidade, Bairro e UF no banco...");

  for (const client of dbClients) {
    let matchedRow: any = null;

    // 1. Tentar cruzar pelo CPF/CNPJ
    const clientCleanDoc = cleanDoc(client.cpfCnpj);
    if (clientCleanDoc && mapByDoc.has(clientCleanDoc)) {
      matchedRow = mapByDoc.get(clientCleanDoc);
    } else {
      // 2. Tenta cruzar pelo Nome normalizado
      const normDbName = normalizeName(client.name);
      if (mapByName.has(normDbName)) {
        matchedRow = mapByName.get(normDbName);
      }
    }

    if (matchedRow) {
      const cep = cleanCep(matchedRow.CEP);
      const cidade = matchedRow.CIDADE ? String(matchedRow.CIDADE).trim() : "";
      const uf = matchedRow.UF ? String(matchedRow.UF).trim().toUpperCase().substring(0, 2) : "";
      const bairro = matchedRow.BAIRRO ? String(matchedRow.BAIRRO).trim() : "";

      // Reconstruir o endereço de forma limpa e estruturada
      let fullAddress = matchedRow.ENDERECO ? String(matchedRow.ENDERECO).trim() : "";
      const num = matchedRow.NUMERO ? String(matchedRow.NUMERO).trim() : "";
      const comp = matchedRow.COMPLEM ? String(matchedRow.COMPLEM).trim() : "";

      if (num && num !== "0" && num !== "") fullAddress += `, ${num}`;
      if (comp && comp !== "0" && comp !== "") fullAddress += ` - ${comp}`;
      if (bairro && bairro !== "") fullAddress += `, ${bairro}`;

      // Executa update no Prisma
      await prisma.client.update({
        where: { id: client.id },
        data: {
          zipCode: cep || undefined,
          city: cidade || undefined,
          state: uf || undefined,
          address: fullAddress || undefined
        }
      });
      updatedCount++;
    } else {
      notFoundCount++;
    }
  }

  console.log("\n=== RESULTADO DA IMPORTAÇÃO FISCAL DE CLIENTES ===");
  console.log(`- Clientes atualizados com CEP/UF/Cidade corretos: ${updatedCount}`);
  console.log(`- Clientes não correspondidos no Excel: ${notFoundCount}`);
  console.log("==================================================");

  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Erro crítico na importação fiscal de clientes:", err);
  prisma.$disconnect();
});
