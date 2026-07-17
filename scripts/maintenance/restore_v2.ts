import fs from 'fs';

function fixV2() {
  const sourcePath = 'data/clientes_para_bling_limpo_v2.csv';
  const targetPath = 'data/clientes_bling_final.csv';

  if (!fs.existsSync(sourcePath)) {
    console.log('Arquivo não encontrado:', sourcePath);
    return;
  }
  
  const fileContent = fs.readFileSync(sourcePath, 'utf8');
  const lines = fileContent.split('\n');
  
  if (lines.length === 0) return;

  const header = lines[0];
  const dataLines = lines.slice(1);
  const fixedLines = [header];

  for (let line of dataLines) {
    if (line.trim().length === 0) continue;

    const cols = line.split(';');

    // 1. Remover João da Silva Teste
    const nome = cols[2] || '';
    if (nome.toLowerCase().includes('joão da silva teste') || nome.toLowerCase().includes('joao da silva teste')) {
      continue;
    }

    // 2. Arrumar Telefones MANTENDO AS ASPAS (que é o que fazia a v2 funcionar bem)
    const fixPhone = (phoneStr: string) => {
      let digits = phoneStr.replace(/"/g, '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        return '""'; // Mantém as aspas vazias para não quebrar a coluna!
      }
      return `"${digits}"`; // Mantém as aspas com os números!
    };

    cols[12] = fixPhone(cols[12] || '""');
    cols[13] = fixPhone(cols[13] || '""');
    cols[14] = fixPhone(cols[14] || '""');

    fixedLines.push(cols.join(';'));
  }

  fs.writeFileSync(targetPath, fixedLines.join('\n'), 'utf8');
  console.log(`Planilha restaurada para a versão limpo_v2 e ajustada salva em: ${targetPath}`);
}

fixV2();
