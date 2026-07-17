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
    
    // indexes: 
    // 7 = Bairro, 8 = CEP, 9 = Cidade, 10 = Estado
    // 17 = Tipo_pessoa, 18 = CNPJ_CPF

    let rawBairro = cols[7]?.replace(/"/g, '') || '';
    let rawCidade = cols[9]?.replace(/"/g, '') || '';
    let rawEstado = cols[10]?.replace(/"/g, '') || '';
    let rawCpfCnpj = cols[18]?.replace(/"/g, '').replace(/\D/g, '') || '';
    
    // 1. Fix CPF/CNPJ
    if (rawCpfCnpj.length > 0 && rawCpfCnpj.length !== 11 && rawCpfCnpj.length !== 14) {
      rawCpfCnpj = '';
      cols[18] = ''; 
    }

    // 2. Fix Tipo_pessoa
    if (rawCpfCnpj.length === 14) {
      cols[17] = '"Juridica"';
      cols[18] = `"${rawCpfCnpj}"`;
    } else if (rawCpfCnpj.length === 11) {
      cols[17] = '"Física"';
      cols[18] = `"${rawCpfCnpj}"`;
    } else {
      cols[17] = '"Física"'; // Default
      cols[18] = '""';
    }

    // 3. Fix Address (Cidade/Estado/CEP)
    // Se a cidade for "Nao informado" ou tiver erro, tentar extrair do Bairro
    let cityFixed = rawCidade;
    let stateFixed = rawEstado;
    
    if (cityFixed.includes('Nao informado') || cityFixed.includes(',') || cityFixed.length > 30) {
      // Try to extract from Bairro "..., Ribeirão Preto/SP (CEP: 14.090-070)"
      const match = rawBairro.match(/,\s*([^,]+?)\/([A-Z]{2})/);
      if (match) {
        cityFixed = match[1].trim();
        stateFixed = match[2].trim();
        
        // Remove city and CEP from Bairro string
        cols[7] = `"${rawBairro.replace(/,\s*[^,]+?\/[A-Z]{2}.*$/, '')}"`;
      } else {
        cityFixed = '';
        stateFixed = '';
      }
    }
    
    // Fallback se não achou cidade
    if (!cityFixed || cityFixed.trim() === '' || cityFixed.toLowerCase() === 'nao informado') {
       cityFixed = '';
       stateFixed = '';
       cols[8] = '""'; // Clear CEP just in case to avoid partial address errors
    }

    cols[9] = `"${cityFixed}"`;
    cols[10] = `"${stateFixed}"`;

    fixedLines.push(cols.join(';'));
  }

  const outputPath = 'data/clientes_para_bling_limpo_v2.csv';
  fs.writeFileSync(outputPath, fixedLines.join('\n'), 'utf8');
  console.log(`Planilha corrigida salva em: ${outputPath}`);
}

fixCSV();
