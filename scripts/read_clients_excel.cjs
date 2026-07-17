const XLSX = require('xlsx');

const workbook = XLSX.readFile("D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\clientes.xls");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Total rows:", data.length);
for (let i = 0; i < 5; i++) {
  console.log(`Row ${i}:`, data[i]);
}
