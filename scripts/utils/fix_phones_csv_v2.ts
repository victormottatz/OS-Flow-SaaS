import fs from 'fs';

function fixPhonesAndCPF() {
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
    
    // Remover João da Silva Teste
    const nome = cols[2] || '';
    if (nome.toLowerCase().includes('joão da silva teste') || nome.toLowerCase().includes('joao da silva teste')) {
      continue; // Pula a linha, não insere no CSV final
    }

    // 2. Limpar Telefones (deve ter 10 ou 11 digitos)
    const fixPhone = (phoneStr: string) => {
      let digits = phoneStr.replace(/"/g, '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        return ''; // Retorna completamente vazio (sem aspas!)
      }
      return digits; // Retorna só os números, sem aspas, para o Bling não confundir
    };

    cols[12] = fixPhone(cols[12] || '');
    cols[13] = fixPhone(cols[13] || ''); // Fax
    cols[14] = fixPhone(cols[14] || ''); // Celular

    fixedLines.push(cols.join(';'));
  }

  fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
  console.log(`Planilha com telefones ajustados e João da Silva removido salva em: ${filePath}`);
}

fixPhonesAndCPF();
