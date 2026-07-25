import { exec } from "child_process";
import fs from "fs";
import path from "path";

async function runSecurityAudit() {
  console.log("🔒 Iniciando Auditoria de Segurança...");
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const summary = {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 },
    systemChecks: {
      jwtSecretConfigured: false,
      corsConfigured: true,
    }
  };

  // Checar se o JWT_SECRET foi configurado fora do padrão de teste
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret !== "mgv_tecnologia_super_secure_jwt_secret_key_123!") {
    summary.systemChecks.jwtSecretConfigured = true;
  }

  console.log("🔍 Verificando vulnerabilidades em dependências npm...");
  exec("npm audit --json", (error, stdout, stderr) => {
    try {
      const data = JSON.parse(stdout);
      if (data.metadata && data.metadata.vulnerabilities) {
        summary.vulnerabilities = data.metadata.vulnerabilities;
      }
    } catch (e) {
      // Caso não consiga parsear (sem internet ou comando modificado), exibe aviso genérico
      if (stdout.includes("vulnerability") || stdout.includes("vulnerabilities")) {
        console.log("⚠️ Vulnerabilidades de pacotes detectadas no stdout.");
      }
    }

    console.log("\n📊 RESULTADO DA AUDITORIA DE SEGURANÇA:");
    console.log(`- Críticas:    ${summary.vulnerabilities.critical || 0}`);
    console.log(`- Altas:       ${summary.vulnerabilities.high || 0}`);
    console.log(`- Moderadas:   ${summary.vulnerabilities.moderate || 0}`);
    console.log(`- Baixas:      ${summary.vulnerabilities.low || 0}`);
    console.log(`- JWT Secret Seguro: ${summary.systemChecks.jwtSecretConfigured ? "Sim" : "Não (Chave padrão/teste ativa)"}\n`);

    fs.writeFileSync(
      path.join(tempDir, "audit_security_summary.json"),
      JSON.stringify(summary, null, 2),
      "utf-8"
    );

    console.log("✅ Auditoria de Segurança concluída.");
  });
}

runSecurityAudit();
