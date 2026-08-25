/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script CLI: Monitor de Sincronização em Tempo Real de Estoque e NCM (Bling V3)
 * Uso:
 *   npx tsx scripts/bling-sync-monitor.ts --start    (Inicia e acompanha)
 *   npx tsx scripts/bling-sync-monitor.ts --status   (Apenas monitora)
 *   npx tsx scripts/bling-sync-monitor.ts --stop     (Interrompe)
 */

import http from "http";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = "localhost";

const args = process.argv.slice(2);
const isStart = args.includes("--start");
const isStop = args.includes("--stop");

// Cores ANSI para Terminal
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgBlue: "\x1b[44m\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m",
};

function formatSeconds(sec: number): string {
  if (sec <= 0 || !Number.isFinite(sec)) return "Calculando...";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function renderProgressBar(percentage: number, width = 36): string {
  const cleanPct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((cleanPct / 100) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${c.cyan}[${c.green}${bar}${c.cyan}] ${c.bold}${cleanPct}%${c.reset}`;
}

function apiRequest(path: string, method: "GET" | "POST", body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        }
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(rawData));
          } catch (e) {
            resolve({ raw: rawData });
          }
        });
      }
    );

    req.on("error", (err) => {
      // Fallback tentativa na porta 3000 se 3001 falhar
      if (PORT === 3001) {
        const req2 = http.request(
          {
            hostname: HOST,
            port: 3000,
            path,
            method,
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData)
            }
          },
          (res2) => {
            let rawData = "";
            res2.on("data", (chunk) => (rawData += chunk));
            res2.on("end", () => {
              try {
                resolve(JSON.parse(rawData));
              } catch (e) {
                resolve({ raw: rawData });
              }
            });
          }
        );
        req2.on("error", reject);
        if (postData) req2.write(postData);
        req2.end();
      } else {
        reject(err);
      }
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  console.clear();

  if (isStop) {
    console.log(`${c.yellow}Enviando solicitação de parada do worker...${c.reset}`);
    try {
      const res = await apiRequest("/api/integration/bling/stock/auto-sync/stop", "POST");
      console.log(`${c.green}✓ ${res.message || "Worker interrompido."}${c.reset}`);
    } catch (e: any) {
      console.error(`${c.red}Falha ao parar: ${e.message}${c.reset}`);
    }
    process.exit(0);
  }

  if (isStart) {
    try {
      const startRes = await apiRequest("/api/integration/bling/stock/auto-sync/start", "POST", { divergentOnly: true });
      if (!startRes.started && startRes.message.includes("andamento")) {
        console.log(`${c.yellow}ℹ️ ${startRes.message}. Conectando ao monitor ao vivo...${c.reset}\n`);
      } else {
        console.log(`${c.green}✓ ${startRes.message}${c.reset}\n`);
      }
    } catch (e: any) {
      console.error(`${c.red}Erro ao iniciar sincronização: ${e.message}. Verifique se o servidor backend está rodando.${c.reset}`);
      process.exit(1);
    }
  }

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  let isFirstRun = true;

  while (true) {
    try {
      const status = await apiRequest("/api/integration/bling/stock/auto-sync/status", "GET");

      // Limpa e redesenha o terminal
      process.stdout.write("\x1b[H\x1b[2J");

      console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
      console.log(`${c.cyan}║${c.reset}  ${c.bold}${c.green}MGV ONE HUB${c.reset} - ${c.bold}MONITOR DE SINCRONIZAÇÃO EM TEMPO REAL (BLING V3)${c.reset}     ${c.cyan}║${c.reset}`);
      console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}\n`);

      // Status Badge
      let statusLabel = `${c.yellow}PARADO / OCIOSO${c.reset}`;
      if (status.status === "running") {
        statusLabel = `${c.bgGreen} EM ANDAMENTO (RODANDO) ${c.reset}`;
      } else if (status.status === "completed") {
        statusLabel = `${c.green}${c.bold}✓ CONCLUÍDO COM SUCESSO${c.reset}`;
      } else if (status.status === "stopped") {
        statusLabel = `${c.yellow}${c.bold}⏹️ INTERROMPIDO PELO USUÁRIO${c.reset}`;
      } else if (status.status === "error") {
        statusLabel = `${c.red}${c.bold}💥 ERRO FATAL: ${status.lastError || "Falha"}${c.reset}`;
      }

      console.log(`  ${c.bold}Status do Worker:${c.reset}  ${statusLabel}`);
      if (status.startTime) {
        console.log(`  ${c.dim}Início:${c.reset}           ${new Date(status.startTime).toLocaleTimeString("pt-BR")}`);
      }
      console.log("");

      // Barra de Progresso
      console.log(`  ${c.bold}Progresso Global:${c.reset}`);
      console.log(`  ${renderProgressBar(status.percentage)}  (${status.processed} de ${status.total} peças)`);
      console.log("");

      // Painel de Indicadores
      console.log(`  ${c.bold}Indicadores em Tempo Real:${c.reset}`);
      console.log(`  ├─ ${c.green}✓ Sucessos:${c.reset}           ${c.bold}${status.successCount || 0}${c.reset}`);
      console.log(`  ├─ ${c.red}❌ Falhas:${c.reset}            ${c.bold}${status.errorCount || 0}${c.reset}`);
      console.log(`  ├─ ⚡ Velocidade:${c.reset}          ${c.bold}${status.itemsPerMinute || 0}${c.reset} itens/minuto`);
      console.log(`  └─ ⏱️ Tempo Estimado (ETA): ${c.cyan}${c.bold}${formatSeconds(status.estimatedRemainingSeconds)}${c.reset}`);
      console.log("");

      if (status.currentItem) {
        console.log(`  ${c.bold}Processando Agora:${c.reset}   ${c.yellow}${status.currentItem}${c.reset}`);
        console.log("");
      }

      // Feed de Logs Recentes
      console.log(`${c.dim}────────────────────────────────────────────────────────────────────────────────${c.reset}`);
      console.log(`  ${c.bold}Últimos Registros / Logs de Sincronização:${c.reset}`);
      console.log(`${c.dim}────────────────────────────────────────────────────────────────────────────────${c.reset}`);

      const recentLogs = (status.logs || []).slice(0, 8);
      if (recentLogs.length === 0) {
        console.log(`  ${c.dim}Nenhum log registrado até o momento...${c.reset}`);
      } else {
        for (const log of recentLogs) {
          let prefix = `${c.dim}[${log.timestamp}]${c.reset}`;
          let logColor = c.reset;
          if (log.type === "success" || log.message.startsWith("✓")) logColor = c.green;
          if (log.type === "error" || log.message.startsWith("❌")) logColor = c.red;
          if (log.message.startsWith("🚀") || log.message.startsWith("📦") || log.message.startsWith("📊")) logColor = c.cyan;
          console.log(`  ${prefix} ${logColor}${log.message}${c.reset}`);
        }
      }

      console.log(`\n${c.dim}────────────────────────────────────────────────────────────────────────────────${c.reset}`);
      console.log(`  ${c.dim}Pressione ${c.bold}Ctrl+C${c.reset}${c.dim} para fechar o monitor (o worker continuará rodando em background).${c.reset}`);

      if (!status.isRunning && !isFirstRun && (status.status === "completed" || status.status === "stopped")) {
        console.log(`\n  ${c.green}${c.bold}Sincronização finalizada! Pressione Ctrl+C para sair.${c.reset}`);
        break;
      }

      isFirstRun = false;
    } catch (err: any) {
      console.log(`${c.red}Aguardando resposta do servidor MGV (${HOST}:${PORT})... [${err.message}]${c.reset}`);
    }

    await sleep(1000);
  }
}

main().catch((err) => {
  console.error("Erro no monitor CLI:", err);
});
