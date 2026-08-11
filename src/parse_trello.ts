import fs from "fs";
import path from "path";

async function main() {
  const jsonPath = "C:/Users/User/Downloads/gPrcXhJ1 - implementacoes-mgv-sistema-integrado.json";
  if (!fs.existsSync(jsonPath)) {
    console.error("Arquivo não encontrado:", jsonPath);
    return;
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  const lists: Record<string, string> = {};
  for (const list of data.lists || []) {
    lists[list.id] = list.name;
  }

  let mdContent = "# Cartões do Trello - Quadro de Implementações MGV\n\n";
  
  const cardsByList: Record<string, any[]> = {};
  for (const card of data.cards || []) {
    if (card.closed) continue; // Ignora arquivados
    const listName = lists[card.idList] || "Desconhecido";
    if (!cardsByList[listName]) {
      cardsByList[listName] = [];
    }
    cardsByList[listName].push({
      title: card.name,
      desc: card.desc || "",
      idShort: card.idShort
    });
  }

  for (const [listName, cards] of Object.entries(cardsByList)) {
    mdContent += `\n## Lista: ${listName}\n`;
    for (const card of cards) {
      mdContent += `\n### [#${card.idShort}] ${card.title}\n`;
      if (card.desc.trim()) {
        const shortDesc = card.desc.length > 500 ? card.desc.slice(0, 500) + "... (resumido)" : card.desc;
        mdContent += `**Descrição:**\n${shortDesc}\n`;
      } else {
        mdContent += `*Sem descrição.*\n`;
      }
    }
  }

  const outPath = path.join("d:/HD/MGV/MGV_2026/MGV-Assistência-Técnica", "trello_cards.md");
  fs.writeFileSync(outPath, mdContent, "utf-8");
  console.log("Arquivo trello_cards.md criado com sucesso em:", outPath);
}

main().catch(console.error);
