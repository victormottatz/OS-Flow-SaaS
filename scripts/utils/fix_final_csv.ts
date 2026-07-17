import fs from 'fs';

function fixCSV() {
  const filePath = 'data/clientes_bling_final.csv';
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo não encontrado:', filePath);
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  
  if (lines.length === 0) return;

  const header = lines[0];
  const dataLines = lines.slice(1);
  const fixedLines = [header];

  for (let line of dataLines) {
    if (line.trim().length === 0) continue;

    const cols = line.split(';');
    
    // indexes: 
    // 7 = Bairro, 8 = CEP, 9 = Cidade, 10 = Estado
    // 17 = Tipo_pessoa, 18 = CNPJ_CPF

    let rawBairro = cols[7]?.replace(/"/g, '') || '';
    let rawCidade = cols[9]?.replace(/"/g, '') || '';
    let rawEstado = cols[10]?.replace(/"/g, '') || '';
    let rawCpfCnpj = cols[18]?.replace(/"/g, '').replace(/\D/g, '') || '';
    
    // 1. Fix CPF/CNPJ and Tipo_pessoa
    if (rawCpfCnpj.length === 14) {
      cols[17] = '"Pessoa Jurídica"';
      cols[18] = `"${rawCpfCnpj}"`;
    } else if (rawCpfCnpj.length === 11) {
      cols[17] = '"Pessoa Física"';
      cols[18] = `"${rawCpfCnpj}"`;
    } else {
      cols[17] = '"Pessoa Física"'; // Default
      cols[18] = '""'; // Clears invalid documents
    }

    // 2. Remove fake addresses that cause validation errors
    if (rawCidade.toLowerCase().includes('nao informado') || rawCidade.includes(',')) {
      // Trying to extract valid city from Bairro if it was concatenated
      const match = rawBairro.match(/,\s*([^,]+?)\/([A-Z]{2})/);
      if (match) {
        cols[9] = `"${match[1].trim()}"`;
        cols[10] = `"${match[2].trim()}"`;
        cols[7] = `"${rawBairro.replace(/,\s*[^,]+?\/[A-Z]{2}.*$/, '')}"`; // Clean the Bairro
      } else {
        // Just clear the city and state entirely to bypass IBGE validation
        cols[9] = '""';
        cols[10] = '""';
      }
    }

    // Remove dummy CEP that also triggers errors
    let rawCep = cols[8]?.replace(/"/g, '') || '';
    if (rawCep === '01000000' || rawCep === '01.000-000' || rawCep.length < 8) {
      cols[8] = '""';
    }

    fixedLines.push(cols.join(';'));
  }

  fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
  console.log(`Planilha final corrigida e sobrescrita em: ${filePath}`);
}

fixCSV();
