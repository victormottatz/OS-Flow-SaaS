import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const startBlock = 'app.get("/api/ordens-servico", async (req, res) => {';
const endBlock = 'res.json({ message: "Ordem de Serviço excluída (soft delete) com sucesso!" });\n    } catch (err: any) {\n      res.status(500).json({ error: err.message });\n    }\n  });';

const startIdx = content.indexOf(startBlock);
const endIdx = content.indexOf(endBlock);

if (startIdx !== -1 && endIdx !== -1) {
  const cutoff = endIdx + endBlock.length;
  content = content.slice(0, startIdx) + 
            "// Rotas de OS migradas para src/routes/os.routes.ts\n  " + 
            content.slice(cutoff);
  fs.writeFileSync('server.ts', content);
  console.log("OS cleanup successful.");
} else {
  console.log("Failed to find boundaries.");
}
