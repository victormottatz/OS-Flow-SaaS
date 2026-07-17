import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add imports at the top
if (!content.includes('import apiRoutes')) {
  content = content.replace(
    'import { PrismaClient } from "@prisma/client";',
    'import { PrismaClient } from "@prisma/client";\nimport { authenticateJWT } from "./src/middlewares/auth";\nimport apiRoutes from "./src/routes";'
  );
}

// 2. Replace the old middleware and mount the routes
const oldMiddlewareStart = '  // Token authentication middleware with backward-compatible role extraction';
const oldMiddlewareEnd = 'res.status(401).json({ error: "Sessão inválida ou expirada. Efetue login novamente." });\n        return;\n      }\n    }\n\n    next();\n  });';
const oldMiddlewareEndRegex = /res\.status\(401\)\.json\(\{ error: "Sess.o inv.lida ou expirada\. Efetue login novamente\." \}\);\n\s*return;\n\s*\}\n\s*\}\n\n\s*next\(\);\n\s*\}\);/;

// Wait, earlier I saw the inline middleware didn't have the comment above it maybe?
// Let's use a simpler replace strategy: just inject `app.use(authenticateJWT);\n    app.use("/api", apiRoutes);` right after `app.use(express.json());`

// Wait, the old middleware will still intercept everything. I need to remove it.
// I will just use regex to remove it.
const middlewareRegex = /app\.use\(\(req, res, next\) => \{\n\s*console\.log\("\[Auth Middleware\] req\.path:", req\.path\);[\s\S]*?next\(\);\n\s*\}\);/m;

content = content.replace(middlewareRegex, 'app.use(authenticateJWT);\n    app.use("/api", apiRoutes);');

fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts');
