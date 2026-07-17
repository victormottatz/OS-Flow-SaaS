const xlsx = require('xlsx');
const fs = require('fs');

function convert(xlsFile, csvFile) {
  try {
    const wb = xlsx.readFile(`temp_migration/${xlsFile}`);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const csv = xlsx.utils.sheet_to_csv(ws);
    fs.writeFileSync(`temp_migration/${csvFile}`, csv);
    console.log(`Converted ${xlsFile} to ${csvFile}`);
  } catch (e) {
    console.error(`Failed to convert ${xlsFile}:`, e.message);
  }
}

convert('TABELA_CLIENTES.xls', 'clientes.csv');
convert('TABELA_EQUIPAMENTOS.xls', 'equipamentos.csv');
convert('TABELA_ORDENS_DE_SERVIÇO.xls', 'ordens de seviços.csv');
convert('estoque 01_07-(novo).xls', 'estoque.csv');
