/**
 * Script utilitário para captura automatizada dos novos snapshots em alta resolução (1920x1080)
 * das telas reais e autênticas da plataforma OS-Flow.
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs/promises";

async function run() {
  console.log("📸 Iniciando captura de novos snapshots da plataforma OS-Flow...");

  const outDir = path.join(process.cwd(), "public", "snapshots");
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5, // 1.5x retina para nitidez excepcional
  });

  // Injeta credenciais de demonstração e silencia popups para prints limpos da interface
  await context.addInitScript(() => {
    localStorage.setItem("osflow_live_demo", "true");
    localStorage.setItem("osflow_onboarding_completed", "true");
    localStorage.setItem("mgv_last_update_version", "5.6.0");
    localStorage.setItem("mgv_update_v5_6_seen", "true");
    localStorage.setItem("osflow_sidebar_minimized", "false");
    localStorage.setItem("osflow_os_view_mode", "kanban");
  });

  const page = await context.newPage();

  const baseUrl = "http://localhost:3001";

  // 1. Dashboard Principal
  console.log("1/5 Capturando Dashboard...");
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(outDir, "dashboard.png"),
    fullPage: false
  });
  console.log("✅ Dashboard salvo em public/snapshots/dashboard.png");

  // 2. Quadro Kanban de Ordens de Serviço
  console.log("2/5 Capturando Quadro Kanban...");
  await page.goto(`${baseUrl}/os`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(outDir, "kanban.png"),
    fullPage: false
  });
  console.log("✅ Kanban salvo em public/snapshots/kanban.png");

  // 3. Hub Fiscal & Integração Bling
  console.log("3/5 Capturando Hub Fiscal Bling...");
  await page.goto(`${baseUrl}/fiscal`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(outDir, "fiscal-bling.png"),
    fullPage: false
  });
  console.log("✅ Hub Fiscal salvo em public/snapshots/fiscal-bling.png");

  // 4. Gestão de Clientes e Equipamentos
  console.log("4/5 Capturando Clientes & Equipamentos...");
  await page.goto(`${baseUrl}/clientes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(outDir, "clientes-equipamentos.png"),
    fullPage: false
  });
  console.log("✅ Clientes salvo em public/snapshots/clientes-equipamentos.png");

  // 5. Nova Ordem de Serviço / Wizard
  console.log("5/6 Capturando Wizard de Nova OS...");
  await page.goto(`${baseUrl}/os/nova`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(outDir, "nova-os-wizard.png"),
    fullPage: false
  });
  console.log("✅ Wizard de Nova OS salvo em public/snapshots/nova-os-wizard.png");

  // 6. Prancheta Técnica de O.S (Abrindo um modal ou tela de detalhes)
  console.log("6/6 Capturando Prancheta Técnica de O.S...");
  await page.goto(`${baseUrl}/os`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Tenta clicar no primeiro cartão do Kanban para abrir a prancheta técnica
  const firstCard = page.locator(".cursor-pointer").filter({ hasText: "OS-" }).first();
  if (await firstCard.count() > 0) {
    await firstCard.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({
    path: path.join(outDir, "prancheta-tecnica.png"),
    fullPage: false
  });
  console.log("✅ Prancheta Técnica salva em public/snapshots/prancheta-tecnica.png");

  await browser.close();
  console.log("🎉 Todos os snapshots atualizados com sucesso!");
}

run().catch((err) => {
  console.error("❌ Erro ao capturar snapshots:", err);
  process.exit(1);
});
