import { default as Database } from "mdb-reader";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mdbPath = "D:\\Dados.MDB";

async function main() {
  const buf = readFileSync(mdbPath);
  const db = new Database(buf);
  const table = db.getTable("ORDEMS");
  const rows = table.getData();

  // Filtra as OSs do dia 22/07/2026 no MDB
  const mdbOsYesterday = rows.filter(row => {
    const entrada = row.ENTRADA;
    if (!entrada) return false;
    const dateStr = new Date(entrada).toISOString().slice(0, 10);
    return dateStr === "2026-07-22";
  });

  // Carrega todas as OSs do banco MGV criadas no dia 22/07/2026
  const dbOsYesterday = await prisma.ordemServico.findMany({
    where: {
      createdAt: {
        gte: new Date("2026-07-22T00:00:00.000Z"),
        lt: new Date("2026-07-23T00:00:00.000Z")
      }
    }
  });

  console.log("| Número Original (SH) | Novo Número Sequencial (MGV) | Defeito Relatado |");
  console.log("|----------------------|-----------------------------|------------------|");

  for (const mdbOs of mdbOsYesterday) {
    const originalCodigo = String(mdbOs.CODIGO);
    const defect = String(mdbOs.DEFEITO || "").trim();

    // Encontra a OS correspondente no banco pelo defeito/laudo/valores
    const matched = dbOsYesterday.find(o => 
      o.reportedDefect?.trim() === defect || 
      (o.diagnostic && mdbOs.LAUDO && o.diagnostic.trim() === String(mdbOs.LAUDO).trim())
    );

    if (matched) {
      if (originalCodigo !== matched.osNumber) {
        console.log(`| ${originalCodigo.padEnd(20)} | ${matched.osNumber.padEnd(27)} | ${defect.slice(0, 30).padEnd(16)} |`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
