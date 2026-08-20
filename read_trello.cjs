const fs = require('fs');

const path = 'C:\\Users\\User\\Downloads\\gPrcXhJ1 - implementacoes-mgv-sistema-integrado (3).json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const listId = data.lists.find(l => l.name.includes("Prioriza")).id;

const priorizacaoCards = data.cards.filter(c => c.idList === listId && !c.closed);

console.log("=== PRIORIZAÇÃO ===");
priorizacaoCards.forEach((c, index) => {
  console.log(`${index + 1}. ${c.name}`);
  console.log(`Desc: ${c.desc}`);
  console.log('---');
});
