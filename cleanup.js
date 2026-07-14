import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Remover Bloco de Clients
const clientsStart = content.indexOf('app.get("/api/clients", async (req, res) => {');
const devicesStart = content.indexOf('app.post("/api/devices", async (req, res) => {');
if (clientsStart !== -1 && devicesStart !== -1) {
  content = content.slice(0, clientsStart) + 
            "// Rotas de Clientes migradas para src/routes/clients.routes.ts\n  " + 
            content.slice(devicesStart);
}

// Remover Bloco de Devices e Device-Categories
const devicesBlockStart = content.indexOf('app.post("/api/devices", async (req, res) => {');
const deviceCategoriesEndString = 'res.status(201).json({\n        ...category,\n        defaultChecklist: typeof category.defaultChecklist === "string"\n          ? JSON.parse(category.defaultChecklist)\n          : category.defaultChecklist || [],\n      });\n    } catch (err: any) {\n      res.status(500).json({ error: err.message });\n    }\n  });';
const categoriesEndIdx = content.indexOf(deviceCategoriesEndString);

if (devicesBlockStart !== -1 && categoriesEndIdx !== -1) {
  const cutoff = categoriesEndIdx + deviceCategoriesEndString.length;
  content = content.slice(0, devicesBlockStart) + 
            "// Rotas de Equipamentos e Categorias migradas para src/routes/devices.routes.ts\n  " + 
            content.slice(cutoff);
}

// Remover Bloco de Parts
const partsStart = content.indexOf('app.get("/api/parts", async (req, res) => {');
const partsEndString = 'res.json({ message: "Peça excluída (soft delete) com sucesso!" });\n    } catch (err: any) {\n      res.status(500).json({ error: err.message });\n    }\n  });';
const partsEndIdx = content.indexOf(partsEndString);

if (partsStart !== -1 && partsEndIdx !== -1) {
  const cutoff = partsEndIdx + partsEndString.length;
  content = content.slice(0, partsStart) + 
            "// Rotas de Peças (Estoque) migradas para src/routes/parts.routes.ts\n  " + 
            content.slice(cutoff);
}

fs.writeFileSync('server.ts', content);
console.log("Cleanup script executed.");
