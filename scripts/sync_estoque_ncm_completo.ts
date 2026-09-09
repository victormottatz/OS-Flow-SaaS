/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Script de Sincronização Direta de Estoque e NCM: MGV One Hub ➔ Bling ERP V3
 * Executa a sincronização completa de todos os itens divergentes com progresso no terminal.
 * 
 * Uso:
 *   npx tsx scripts/sync_estoque_ncm_completo.ts
 */

import "dotenv/config";
import prisma from "../src/database/prisma";
import { 
  auditStockAndFiscalDivergences, 
  syncSinglePartToBling 
} from "../src/services/bling";

// Cores ANSI para Terminal
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgGreen: "\x1b[42m\x1b[30m",
};

function formatSeconds(sec: number): string {
  if (sec <= 0 || !Number.isFinite(sec)) return "Calculando...";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function renderProgressBar(percentage: number, current: number, total: number, width = 30): string {
  const cleanPct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((cleanPct / 100) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${c.cyan}[${c.green}${bar}${c.cyan}] ${c.bold}${cleanPct}%${c.reset} (${current}/${total})`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runFullSync() {
  console.clear();
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${c.bold}${c.green}MGV ONE HUB${c.reset} - ${c.bold}SINCRONIZADOR DE ESTOQUE & DADOS FISCAIS (BLING V3)${c.reset}     ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.yellow}⏳ 1/2. Varrendo catálogo do Bling e banco de peças do MGV...${c.reset}`);
  const startTime = Date.now();
  const report = await auditStockAndFiscalDivergences();

  console.log(`\n${c.bold}📊 Resultado da Auditoria Inicial:${c.reset}`);
  console.log(`  ├─ Total de Itens no Sistema:   ${c.bold}${report.totalItems}${c.reset}`);
  console.log(`  ├─ ✅ 100% Sincronizados:       ${c.green}${c.bold}${report.synchronizedCount}${c.reset}`);
  console.log(`  ├─ ⚠️ Divergências de Estoque:   ${c.yellow}${c.bold}${report.qtyDivergenceCount}${c.reset}`);
  console.log(`  ├─ 📋 Divergências de NCM:      ${c.cyan}${c.bold}${report.fiscalDivergenceCount}${c.reset}`);
  console.log(`  └─ 📦 Itens Exclusivos do MGV:  ${c.yellow}${c.bold}${report.onlyMgvCount}${c.reset}\n`);

  // Filtra itens para sincronizar
  const targetItems = report.items.filter(i => 
    i.partId && (i.status === "QTY_DIVERGENCE" || i.status === "FISCAL_DIVERGENCE" || i.status === "ONLY_MGV")
  );

  const total = targetItems.length;

  if (total === 0) {
    console.log(`${c.green}${c.bold}✅ Todas as peças já estão 100% sincronizadas com o Bling! Nada a fazer.${c.reset}`);
    return;
  }

  console.log(`${c.bold}🚀 2/2. Iniciando sincronização de ${total} peças para o Bling ERP...${c.reset}`);
  console.log(`${c.dim}Intervalo de segurança: 500ms por peça para respeitar o Rate Limit do Bling.\n${c.reset}`);

  let successCount = 0;
  let errorCount = 0;
  const syncStartTime = Date.now();

  for (let i = 0; i < total; i++) {
    const item = targetItems[i];
    const current = i + 1;
    const percentage = Math.round((current / total) * 100);

    const elapsedSeconds = (Date.now() - syncStartTime) / 1000;
    const ratePerSec = elapsedSeconds > 0 ? current / elapsedSeconds : 0;
    const remainingSeconds = ratePerSec > 0 ? Math.round((total - current) / ratePerSec) : 0;

    const progressStr = renderProgressBar(percentage, current, total);
    const etaStr = `ETA: ${c.cyan}${formatSeconds(remainingSeconds)}${c.reset}`;

    try {
      if (item.partId) {
        await syncSinglePartToBling(item.partId);
        successCount++;
        console.log(` ${progressStr} | ${etaStr} | ${c.green}✓ ${item.code}${c.reset} - Saldo: ${item.stockMgv}, NCM: ${item.ncmMgv || "N/A"}`);
      }
    } catch (err: any) {
      errorCount++;
      console.log(` ${progressStr} | ${etaStr} | ${c.red}❌ ${item.code}${c.reset} - Erro: ${err.message}`);
    }

    // Delay de segurança para rate limit da API do Bling
    await sleep(500);
  }

  const totalDurationMin = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log(`\n${c.cyan}══════════════════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.green}${c.bold}🎉 SINCRONIZAÇÃO COMPLETA CONCLUÍDA EM ${totalDurationMin} MINUTOS!${c.reset}`);
  console.log(`  ├─ ${c.green}✓ Sucessos:${c.reset}  ${c.bold}${successCount}${c.reset}`);
  console.log(`  └─ ${c.red}❌ Falhas:${c.reset}    ${c.bold}${errorCount}${c.reset}`);
  console.log(`${c.cyan}══════════════════════════════════════════════════════════════════════════════${c.reset}\n`);
}

runFullSync().catch(err => {
  console.error("\nErro fatal na sincronização:", err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
