const XLSX = require('xlsx');

const workbook = XLSX.readFile("D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\ordens de serviço 17.07 16_46.xls");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 0) {
  let situacaoIdx = -1;
  // find header row
  for(let r=0; r<10; r++) {
    const row = data[r];
    if(row) {
      situacaoIdx = row.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('situa'));
      if(situacaoIdx !== -1) {
        break;
      }
    }
  }

  if (situacaoIdx !== -1) {
    const situacoes = new Set();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[situacaoIdx] && typeof row[situacaoIdx] === 'string') {
        const val = row[situacaoIdx].trim();
        if (val.toLowerCase() !== 'situação') {
          situacoes.add(val);
        }
      }
    }
    console.log("Distinct statuses in SH Oficina spreadsheet:");
    situacoes.forEach(s => console.log(s));
  } else {
    console.log("Could not find Situação column.");
  }
}
