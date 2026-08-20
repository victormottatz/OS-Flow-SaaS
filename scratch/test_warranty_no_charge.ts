/**
 * Teste temporário — "Sem cobrança" para equipamentos em garantia (porta 3001).
 *  A) OS em garantia finalizada com invoiceType "bifasico" → NÃO fatura:
 *     billingStatus DISPENSADO, financialStatus PAGO, log contém "garantia".
 *  B) OS sem garantia finalizada com "nenhum" → DISPENSADO (comportamento atual).
 *  C) OS sem garantia com "bifasico" → PROCESSANDO (faturamento inicia de verdade).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3001";
const p = new PrismaClient();

let ownerId = "";
let clientId = "";
let devWarrantyId = "";
let devCleanId = "";
let devBillingId = "";
let osWarrantyId = "";
let osCleanId = "";

function log(ok: boolean, label: string, extra?: string) {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra ? " — " + extra : ""}`);
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {}
  return { status: res.status, body };
}

async function main() {
  const password = "NoCharge#Teste2026!";

  const owner = await p.user.create({
    data: { name: "NoCharge Test Owner", email: `nocharge.${Date.now()}@mgvteste.com.br`, passwordHash: await bcrypt.hash(password, 10), role: "OWNER" }
  });
  ownerId = owner.id;

  const client = await p.client.create({
    data: { name: "Cliente NoCharge Teste", cpfCnpj: "52998224725", phone: "16999999999", email: `nc.${Date.now()}@teste.com`, address: "Rua Teste, 123" }
  });
  clientId = client.id;

  const devWarranty = await p.device.create({
    data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-NC-WARR-1", description: "Teste", warrantyExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) }
  });
  devWarrantyId = devWarranty.id;

  const devClean = await p.device.create({
    data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-NC-CLEAN-1", description: "Teste" }
  });
  devCleanId = devClean.id;

  const devBilling = await p.device.create({
    data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-NC-BILL-1", description: "Teste" }
  });
  devBillingId = devBilling.id;

  const login = await api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: owner.email, password }) });
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${login.body.token}` };

  // ── Cenário A: OS em garantia → finalização sem cobrança ──
  const a = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devWarranty.id, reportedDefect: "Não liga" }) });
  osWarrantyId = a.body.id || "";
  await api(`/api/ordens-servico/${osWarrantyId}`, { method: "PUT", headers: auth, body: JSON.stringify({ diagnostic: "Fonte de alimentação trocada", usedParts: [{ id: "svc-warr-1", name: "Mão de Obra", category: "SERVICO", quantity: 1, price: 50, costSnapshot: 10 }] }) });

  const finA = await api(`/api/ordens-servico/${osWarrantyId}/status`, {
    method: "PUT", headers: auth,
    body: JSON.stringify({ status: "FINALIZADO", invoiceType: "bifasico", paymentMethod: "PIX", paymentDetails: [{ method: "PIX", amount: 50 }] })
  });
  const bA = finA.body.billingStatus;
  const fA = finA.body.financialStatus;
  const logsA = Array.isArray(finA.body.billingLogs) ? finA.body.billingLogs.join(" | ") : "";
  log(finA.status === 200 && bA === "DISPENSADO" && fA === "PAGO", "A) OS em garantia finalizada → sem faturamento (DISPENSADO + PAGO)", `HTTP ${finA.status} | billing=${bA} | fin=${fA}`);
  log(logsA.toLowerCase().includes("garantia") && !logsA.includes("Bling"), "A) Log explica garantia e NÃO menciona Bling", logsA.slice(0, 120));

  // ── Cenário B: OS sem garantia + "nenhum" → DISPENSADO (comportamento existente) ──
  const b = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devClean.id, reportedDefect: "Risco na tela" }) });
  osCleanId = b.body.id || "";
  await api(`/api/ordens-servico/${osCleanId}`, { method: "PUT", headers: auth, body: JSON.stringify({ diagnostic: "Tela substituída", usedParts: [{ id: "svc-clean-1", name: "Mão de Obra", category: "SERVICO", quantity: 1, price: 80, costSnapshot: 20 }] }) });
  const finB = await api(`/api/ordens-servico/${osCleanId}/status`, { method: "PUT", headers: auth, body: JSON.stringify({ status: "FINALIZADO", invoiceType: "nenhum" }) });
  log(finB.status === 200 && finB.body.billingStatus === "DISPENSADO", "B) OS sem garantia + 'nenhum' → DISPENSADO", `HTTP ${finB.status} | billing=${finB.body.billingStatus}`);

  // ── Cenário C: OS sem garantia + "bifasico" → PROCESSANDO (faturamento inicia) ──
  const c = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devBilling.id, reportedDefect: "Botão preso" }) });
  await api(`/api/ordens-servico/${c.body.id}`, { method: "PUT", headers: auth, body: JSON.stringify({ diagnostic: "Botão limpo", usedParts: [{ id: "svc-botao-1", name: "Mão de Obra", category: "SERVICO", quantity: 1, price: 40, costSnapshot: 10 }] }) });
  const finC = await api(`/api/ordens-servico/${c.body.id}/status`, { method: "PUT", headers: auth, body: JSON.stringify({ status: "FINALIZADO", invoiceType: "bifasico" }) });
  log(finC.status === 200 && finC.body.billingStatus === "PROCESSANDO", "C) OS sem garantia + 'bifasico' → PROCESSANDO (faturamento inicia)", `HTTP ${finC.status} | billing=${finC.body.billingStatus}`);

  // ── Detalhe: etiqueta permanece e status financeiro refletido ──
  const detail = await api(`/api/ordens-servico/${osWarrantyId}`, { headers: auth });
  log(detail.status === 200 && detail.body.billingStatus === "DISPENSADO" && (detail.body.tags || []).some((t: any) => t.name === "Em Garantia"), "Detalhe da OS em garantia: DISPENSADO + etiqueta presente", `HTTP ${detail.status}`);

  // ── Anti-regressão: OS finalizada SEM garantia NÃO pode casar consigo mesma ──
  const detailB = await api(`/api/ordens-servico/${osCleanId}`, { headers: auth });
  log(detailB.status === 200 && !(detailB.body.tags || []).some((t: any) => t.name === "Em Garantia"), "OS finalizada sem garantia (B) NÃO recebe etiqueta (auto-exclusão)", `HTTP ${detailB.status}`);
}

async function cleanup() {
  try {
    await p.ordemServico.deleteMany({ where: { id: { in: [osWarrantyId, osCleanId].filter(Boolean) } } });
    await p.ordemServico.deleteMany({ where: { clientId } });
    await p.device.deleteMany({ where: { id: { in: [devWarrantyId, devCleanId, devBillingId].filter(Boolean) } } });
    if (clientId) await p.client.delete({ where: { id: clientId } });
    if (ownerId) await p.user.delete({ where: { id: ownerId } });
    log(true, "Limpeza concluída (dados de teste removidos)");
  } catch (e: any) {
    log(false, "Limpeza parcial", e.message);
  }
}

main()
  .catch(e => log(false, "TESTE FALHOU", e.message))
  .finally(async () => {
    await cleanup();
    await p.$disconnect();
    process.exit(0);
  });
