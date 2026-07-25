import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function runPerformanceAudit() {
  console.log("⚡ Iniciando Auditoria de Performance com Lighthouse...");
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const reportPath = path.join(tempDir, "lighthouse-report.json");
  const targetUrl = "http://127.0.0.1:3000/";

  try {
    console.log(`🔍 Executando auditoria no endereço: ${targetUrl}...`);
    
    const profileDir = path.join(process.cwd(), "temp", "chrome-profile").replace(/\\/g, "/");
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Cria diretório temporário local específico para o Lighthouse
    const lighthouseTempDir = path.join(process.cwd(), "temp", "lh-temp").replace(/\\/g, "/");
    if (!fs.existsSync(lighthouseTempDir)) {
      fs.mkdirSync(lighthouseTempDir, { recursive: true });
    }

    // Executa o Lighthouse CLI redirecionando o diretório de dados do usuário e do sistema
    const cmd = `npx lighthouse ${targetUrl} --output=json --output-path="${reportPath}" --chrome-flags="--headless --no-sandbox --disable-gpu --user-data-dir=${profileDir}" --quiet`;
    execSync(cmd, { 
      stdio: "inherit",
      env: {
        ...process.env,
        TEMP: lighthouseTempDir,
        TMP: lighthouseTempDir
      }
    });

    if (!fs.existsSync(reportPath)) {
      throw new Error("Relatório do Lighthouse não foi gerado.");
    }

    const reportContent = fs.readFileSync(reportPath, "utf-8");
    const report = JSON.parse(reportContent);

    const categories = report.categories;
    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
    };

    console.log("\n📊 RESULTADO DA AUDITORIA LIGHTHOUSE:");
    console.log(`- Performance:      ${scores.performance}/100`);
    console.log(`- Acessibilidade:   ${scores.accessibility}/100`);
    console.log(`- Melhores Práticas: ${scores.bestPractices}/100`);
    console.log(`- SEO:              ${scores.seo}/100\n`);

    // Alerta se alguma pontuação crucial estiver muito baixa
    if (scores.performance < 50 || scores.accessibility < 50) {
      console.warn("⚠️ ALERTA: Performance ou Acessibilidade estão abaixo do esperado (50).");
    }

    // Salva um resumo limpo em json
    fs.writeFileSync(
      path.join(tempDir, "audit_lighthouse_summary.json"),
      JSON.stringify(scores, null, 2),
      "utf-8"
    );

    console.log("✅ Auditoria do Lighthouse concluída e salva com sucesso.");
  } catch (error: any) {
    console.error("❌ Erro ao executar auditoria do Lighthouse:", error.message);
    process.exit(1);
  }
}

runPerformanceAudit();
