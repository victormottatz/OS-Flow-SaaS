import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// The middleware starts at line 145 approx
const startIdx = content.indexOf('app.use((req, res, next) => {');
const nextUseIdx = content.indexOf('app.use(vite.middlewares);', startIdx);
const ifViteIdx = content.indexOf('if (process.env.NODE_ENV !== "production") {', startIdx);

if (startIdx !== -1 && ifViteIdx !== -1) {
  const before = content.substring(0, startIdx);
  const after = content.substring(ifViteIdx);
  content = before + 'app.use(authenticateJWT);\n    app.use("/api", apiRoutes);\n\n    ' + after;
  fs.writeFileSync('server.ts', content);
  console.log('Fixed server.ts');
} else {
  console.log('Could not find indices');
}
