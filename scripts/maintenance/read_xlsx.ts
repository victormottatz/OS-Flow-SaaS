import XLSX from "xlsx";
import * as path from "path";

async function run() {
  const filePath = "D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\docs\\Nova pasta (3)\\CLIENTES.xlsx";
  console.log(`Lendo arquivo Excel: ${filePath}`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`Total de linhas no Excel: ${data.length}`);
    if (data.length > 0) {
      console.log("\nCabeçalhos e colunas encontradas no Excel:");
      console.log(Object.keys(data[0]));
      
      console.log("\nAmostra das 5 primeiras linhas:");
      console.log(data.slice(0, 5));
    }
  } catch (err: any) {
    console.error("Erro ao ler o arquivo Excel:", err.message);
  }
}

run();
