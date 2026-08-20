/**
 * Teste de regressão — chip "Em Garantia" em cards com warrantyType FABRICA/MGV.
 *  A) OS criada com warrantyType FABRICA → listagem mostra etiqueta "Em Garantia".
 *  B) Finalização de OS FABRICA → sem cobrança (DISPENSADO + PAGO, sem Bling).
 *  C) OS sem garantia (NENHUMA, aparelho limpo) → SEM etiqueta e faturamento normal.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3001";
const p = new PrismaClient();

let ownerId = "";
let clientId = "";
let devFabId = "";
let devCleanId = "";
const osIds: string[] = [];

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
  const password = "Chip#Warranty2026!";
  const owner = await p.user.create({
    data: { name: "Chip Warranty", email: `chipwarr.${Date.now()}@mgvteste.com.br`, passwordHash: await bcrypt.hash(password, 10), role: "OWNER" }
  });
  const client = await p.client.create({
    data: { name: "Cliente Chip Teste", cpfCnpj: "52998224725", phone: "16999999999", email: `chip.${Date.now()}@teste.com`, address: "Rua Teste, 123" }
  });
  const devFab = await p.device.create({ data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-CHIP-FAB-1", description: "Teste" } });
  const devClean = await p.device.create({ data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-CHIP-CLEAN-1", description: "Teste" } });
  devFabId = devFab.id;
  devCleanId = devClean.id;
  clientId = client.id;
  ownerId = owner.id;

  const login = await api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: owner.email, password }) });
  log(login.status === 200, "Login OK", `HTTP ${login.status} | token=${login.body.token ? "sim" : "nao"}`);
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${login.body.token}` };

  // ── A) OS FABRICA → etiqueta na criação ──
  const a = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devFab.id, reportedDefect: "Não liga", warrantyType: "FABRICA" }) });
  osIds.push(a.body.id);
  const tagsA = Array.isArray(a.body.tags) ? a.body.tags : [];
  log(a.status === 201 && tagsA.some((t: any) => t.name === "Em Garantia"), "A) OS com warrantyType FABRICA → etiqueta 'Em Garantia' na criação", `HTTP ${a.status} | tags=[${tagsA.map((t: any) => t.name).join(",")}]`);

  // ── B) Finalização FABRICA → sem cobrança ──
  await api(`/api/ordens-servico/${a.body.id}`, { method: "PUT", headers: auth, body: JSON.stringify({ diagnostic: "Fonte trocada", usedParts: [{ id: "svc-chip-1", name: "Mão de Obra", category: "SERVICO", quantity: 1, price: 60, costSnapshot: 15 }] }) });
  const finB = await api(`/api/ordens-servico/${a.body.id}/status`, { method: "PUT", headers: auth, body: JSON.stringify({ status: "FINALIZADO", invoiceType: "bifasico", paymentMethod: "PIX", paymentDetails: [{ method: "PIX", amount: 60 }] }) });
  const logsB = Array.isArray(finB.body.billingLogs) ? finB.body.billingLogs.join(" | ") : "";
  log(finB.status === 200 && finB.body.billingStatus === "DISPENSADO" && finB.body.financialStatus === "PAGO", "B) OS FABRICA finalizada → sem cobrança (DISPENSADO + PAGO)", `HTTP ${finB.status} | billing=${finB.body.billingStatus} | fin=${finB.body.financialStatus}`);
  log(logsB.toLowerCase().includes("garantia") && !logsB.includes("Bling"), "B) Log explica garantia e não menciona Bling", logsB.slice(0, 110));

  // ── C) OS limpa → sem etiqueta + faturamento normal ──
  const c = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devClean.id, reportedDefect: "Risco na tela", warrantyType: "NENHUMA" }) });
  osIds.push(c.body.id);
  const tagsC = Array.isArray(c.body.tags) ? c.body.tags : [];
  log(c.status === 201 && !tagsC.some((t: any) => t.name === "Em Garantia"), "C) OS sem garantia → SEM etiqueta na criação", `HTTP ${c.status} | tags=[${tagsC.map((t: any) => t.name).join(",")}]`);

  // ── Listagem (o que alimenta o Kanban) ──
  const list = await api("/api/ordens-servico?pageSize=500&includeRelations=true", { headers: auth });
  const data = Array.isArray(list.body) ? list.body : (list.body.data || []);
  const osA = data.find((o: any) => o.id === a.body.id);
  const osC = data.find((o: any) => o.id === c.body.id);
  const tagsListA = Array.isArray(osA?.tags) ? osA.tags : [];
  const tagsListC = Array.isArray(osC?.tags) ? osC.tags : [];
  log(!!osA && tagsListA.some((t: any) => t.name === "Em Garantia"), "A) Listagem do Kanban → OS FABRICA COM etiqueta (chip visível no card)", `tags=[${tagsListA.map((t: any) => t.name).join(",")}]`);
  log(!!osC && !tagsListC.some((t: any) => t.name === "Em Garantia"), "C) Listagem do Kanban → OS sem garantia SEM etiqueta", `tags=[${tagsListC.map((t: any) => t.name).join(",")}]`);
}

async function cleanup() {
  try {
    await p.ordemServico.deleteMany({ where: { id: { in: osIds.filter(Boolean) } } });
    if (devFabId) await p.device.delete({ where: { id: devFabId } });
    if (devCleanId) await p.device.delete({ where: { id: devCleanId } });
    if (clientId) await p.client.delete({ where: { id: clientId } });
    if (ownerId) await p.user.delete({ where: { id: ownerId } });
    log(true, "Limpeza concluída (apenas dados deste teste)");
  } catch (e: any) {
    log(false, "Limpeza parcial", e.message);
  }
}

main()
  .catch(e => log(false, "TESTE FALHOU", e.message))
  .finally(async () => { await cleanup(); await p.$disconnect(); process.exit(0); });
