const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

const routesToRemove = [
  '/api/clients',
  '/api/devices',
  '/api/ordens-servico',
  '/api/parts',
  '/api/device-categories' // Adicionando caso exista
];

let inRemoveBlock = false;
let braceCount = 0;
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (!inRemoveBlock) {
    // Verifica se a linha inicia uma rota que queremos remover
    const isTargetRoute = routesToRemove.some(route => {
      // Regex para encontrar app.get("/api/clients" etc.
      const regex = new RegExp(`app\\.(get|post|put|delete)\\(\\"${route}`);
      return regex.test(line);
    });

    if (isTargetRoute) {
      inRemoveBlock = true;
      braceCount = 0;
      // Conta as chaves na linha de abertura
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      continue;
    } else {
      newLines.push(line);
    }
  } else {
    // Estamos dentro de um bloco para remover
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;

    if (braceCount === 0) {
      // Fechou o bloco principal da rota
      inRemoveBlock = false;
    }
  }
}

fs.writeFileSync('server.ts', newLines.join('\n'));
console.log('Apocalipse concluído!');
