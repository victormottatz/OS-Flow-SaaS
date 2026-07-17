import fs from 'fs';

function fixCSV() {
  const fileContent = fs.readFileSync('data/clientes_para_bling.csv', 'utf8');
  const lines = fileContent.split('\n');
  
  if (lines.length === 0) return;

  const header = lines[0];
  const dataLines = lines.slice(1);
  const fixedLines = [header];

  for (let line of dataLines) {
    if (line.trim().length === 0) continue;

    const cols = line.split(';');
    
    // index 17 = Tipo_pessoa
    // index 18 = CNPJ_CPF
    let rawCpfCnpj = cols[18]?.replace(/"/g, '').replace(/\D/g, '') || '';
    
    // Check if valid length
    if (rawCpfCnpj.length > 0 && rawCpfCnpj.length < 11) {
      // Invalid length for CPF, clean it to avoid validation errors
      rawCpfCnpj = '';
      cols[18] = ''; 
    }

    if (rawCpfCnpj.length > 11) {
      cols[17] = '"Juridica"';
      cols[18] = `"${rawCpfCnpj}"`;
    } else if (rawCpfCnpj.length === 11) {
      cols[17] = '"Física"';
      cols[18] = `"${rawCpfCnpj}"`;
    } else {
      cols[17] = '"Física"'; // Default
    }

    fixedLines.push(cols.join(';'));
  }

  const outputPath = 'data/clientes_para_bling_corrigido.csv';
  fs.writeFileSync(outputPath, fixedLines.join('\n'), 'utf8');
  console.log(`Planilha corrigida salva em: ${outputPath}`);
}

fixCSV();
