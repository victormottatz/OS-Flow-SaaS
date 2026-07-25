import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

// Função helper para esperar o servidor responder
async function waitPort3000(timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch("http://127.0.0.1:3000/");
      return true;
    } catch (err) {
      // Ignorar erro de conexão e tentar novamente
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function runOrchestrator() {
  console.log("🏁 INICIANDO PIPELINE DE AUDITORIA AUTOMATIZADA (MGV) 🏁\n");

  const startTime = new Date();
  let playwrightSuccess = false;
  let lighthouseSuccess = false;
  let securitySuccess = false;
  let serverProcess: any = null;

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Verificar se o servidor já está rodando
    let isServerRunning = false;
    try {
      await fetch("http://127.0.0.1:3000/");
      isServerRunning = true;
      console.log("ℹ️ Servidor de desenvolvimento detectado na porta 3000. Reutilizando...");
    } catch (e) {
      console.log("🚀 Servidor não detectado. Iniciando servidor local em segundo plano...");
      // Inicia o servidor em background
      serverProcess = spawn("npm", ["run", "dev"], {
        shell: true,
        stdio: "ignore",
        detached: false
      });

      // Aguarda o servidor subir
      const ready = await waitPort3000();
      if (!ready) {
        throw new Error("Servidor não iniciou a tempo na porta 3000.");
      }
      console.log("✅ Servidor local iniciado com sucesso.");
    }

    // 1. Executar Testes E2E com Playwright
    console.log("--------------------------------------------------");
    console.log("🎭 Passo 1: Executando Testes E2E (Playwright)...");
    try {
      execSync("npx playwright test", { stdio: "inherit" });
      playwrightSuccess = true;
      console.log("✅ Testes E2E concluídos com sucesso.");
    } catch (error) {
      console.error("❌ Falha nos testes E2E.");
    }

    // 2. Executar Auditoria de Performance (Lighthouse)
    console.log("--------------------------------------------------");
    console.log("⚡ Passo 2: Executando Auditoria de Performance (Lighthouse)...");
    try {
      execSync("npx tsx scripts/audit/performance_audit.ts", { stdio: "inherit" });
      lighthouseSuccess = true;
    } catch (error) {
      console.error("❌ Falha na auditoria de performance.");
    }

    // 3. Executar Auditoria de Segurança
    console.log("--------------------------------------------------");
    console.log("🔒 Passo 3: Executando Auditoria de Segurança...");
    try {
      execSync("npx tsx scripts/audit/security_audit.ts", { stdio: "inherit" });
      securitySuccess = true;
    } catch (error) {
      console.error("❌ Falha na auditoria de segurança.");
    }

  } catch (error: any) {
    console.error("❌ Ocorreu um erro no orquestrador:", error.message);
  } finally {
    // Derruba o servidor se foi iniciado por nós
    if (serverProcess) {
      console.log("--------------------------------------------------");
      console.log("🔌 Encerrando servidor de desenvolvimento temporário...");
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${serverProcess.pid} /f /t`);
        } else {
          serverProcess.kill("SIGINT");
        }
        console.log("✅ Servidor finalizado.");
      } catch (err) {}
    }
  }

  // 4. Consolidar Relatório Final
  console.log("--------------------------------------------------");
  console.log("📝 Passo 4: Consolidando Relatório Final...");

  const reportPath = path.join(process.cwd(), "post_audit_report.md");
  const endTime = new Date();
  const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

  // Carregar dados de resumo se disponíveis
  let lighthouseSummary = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  try {
    const lSummaryPath = path.join(tempDir, "audit_lighthouse_summary.json");
    if (fs.existsSync(lSummaryPath)) {
      lighthouseSummary = JSON.parse(fs.readFileSync(lSummaryPath, "utf-8"));
    }
  } catch (err) {}

  let securitySummary = { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 }, systemChecks: { jwtSecretConfigured: false } };
  try {
    const sSummaryPath = path.join(tempDir, "audit_security_summary.json");
    if (fs.existsSync(sSummaryPath)) {
      securitySummary = JSON.parse(fs.readFileSync(sSummaryPath, "utf-8"));
    }
  } catch (err) {}

  const reportMarkdown = `# Relatório Pós-Auditoria Automática (MGV)

*Gerado automaticamente em ${endTime.toLocaleString("pt-BR")}*
*Duração total da auditoria: ${duration} segundos*

## Status Geral
| Módulo | Status | Detalhes |
| :--- | :--- | :--- |
| **Testes E2E (Playwright)** | ${playwrightSuccess ? "✅ Aprovado" : "❌ Reprovado"} | 6 fluxos testados no Chromium/Firefox/WebKit |
| **Performance (Lighthouse)** | ${lighthouseSuccess ? "✅ Concluído" : "❌ Falha"} | Pontuação: P:${lighthouseSummary.performance} A:${lighthouseSummary.accessibility} BP:${lighthouseSummary.bestPractices} SEO:${lighthouseSummary.seo} |
| **Segurança (Auditoria)** | ${securitySuccess ? "✅ Concluído" : "❌ Falha"} | Vulnerabilidades: C:${securitySummary.vulnerabilities.critical} H:${securitySummary.vulnerabilities.high} M:${securitySummary.vulnerabilities.moderate} L:${securitySummary.vulnerabilities.low} |

## Detalhes da Performance (Lighthouse)
- **Performance**: ${lighthouseSummary.performance}/100
- **Acessibilidade**: ${lighthouseSummary.accessibility}/100
- **Melhores Práticas**: ${lighthouseSummary.bestPractices}/100
- **SEO**: ${lighthouseSummary.seo}/100

## Detalhes da Segurança
- **Vulnerabilidades de dependências**:
  - Críticas: ${securitySummary.vulnerabilities.critical || 0}
  - Altas: ${securitySummary.vulnerabilities.high || 0}
  - Moderadas: ${securitySummary.vulnerabilities.moderate || 0}
  - Baixas: ${securitySummary.vulnerabilities.low || 0}
- **JWT_SECRET Seguro**: ${securitySummary.systemChecks.jwtSecretConfigured ? "Sim" : "Não (Chave de teste/padrão ativa no ambiente)"}

---
*Relatório de conformidade MGV.*
`;

  fs.writeFileSync(reportPath, reportMarkdown, "utf-8");
  console.log(`\n🎉 Relatório consolidado gerado com sucesso em: ${reportPath}`);

  // Se algum passo de teste ou segurança falhou, termina o processo com erro para o CI/Terminal saber
  if (!playwrightSuccess || !securitySuccess) {
    console.error("\n❌ A auditoria terminou com alertas ou erros nos módulos obrigatórios (E2E ou Segurança).");
    process.exit(1);
  } else {
    console.log("\n🏁 Auditoria concluída com 100% de sucesso! 🏁");
    process.exit(0);
  }
}

runOrchestrator();
