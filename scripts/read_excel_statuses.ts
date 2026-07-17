import * as XLSX from 'xlsx';

const workbook = XLSX.readFile("D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\ordens de serviço 17.07 16_46.xls");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 0) {
  const headers: any = data[0];
  const situacaoIdx = headers.findIndex((h: string) => h && h.toLowerCase().includes('situa'));
  
  if (situacaoIdx !== -1) {
    const situacoes = new Set<string>();
    for (let i = 1; i < data.length; i++) {
      const row: any = data[i];
      if (row && row[situacaoIdx]) {
        situacoes.add(row[situacaoIdx].toString().trim());
      }
    }
    console.log("Distinct statuses in SH Oficina spreadsheet:");
    situacoes.forEach(s => console.log(s));
  } else {
    console.log("Could not find Situação column.");
    console.log("Headers:", headers);
  }
}
