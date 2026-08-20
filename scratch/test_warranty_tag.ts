/**
 * Teste temporário — etiqueta automática "Em Garantia" nas OS (porta 3001).
 * Cenários isolados por aparelho:
 *  A) aparelho com warrantyExpiresAt futuro → etiqueta na criação
 *  B) aparelho limpo (sem garantia e sem OS anterior) → SEM etiqueta
 *  C) retorno dentro da garantia MGV 90 dias (OS anterior FINALIZADA) → etiqueta
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3001";
const p = new PrismaClient();

let ownerId = "";
let clientId = "";
let devWarrantyId = "";
let devCleanId = "";
let devReparoId = "";
let osWarrantyId = "";
let osCleanId = "";
let osReparoId = "";

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
  const password = "Warranty#Teste2026!";

  const owner = await p.user.create({
    data: { name: "Warranty Test Owner", email: `warranty.${Date.now()}@mgvteste.com.br`, passwordHash: await bcrypt.hash(password, 10), role: "OWNER" }
  });
  ownerId = owner.id;

  const client = await p.client.create({
    data: { name: "Cliente Garantia Teste", cpfCnpj: "52998224725", phone: "16999999999", email: `g.${Date.now()}@teste.com`, address: "Rua Teste, 123" }
  });
  clientId = client.id;

  const devWarranty = await p.device.create({
    data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-WARRANTY-1", description: "Teste", warrantyExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) }
  });
  devWarrantyId = devWarranty.id;

  const devClean = await p.device.create({
    data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-CLEAN-1", description: "Teste" }
  });
  devCleanId = devClean.id;

  const devReparo = await p.device.create({
    data: { clientId: client.id, type: "Ultrassom", brand: "Ibramed", model: "Neurodyn", serialNumber: "SN-REPARO-1", description: "Teste" }
  });
  devReparoId = devReparo.id;

  const login = await api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: owner.email, password }) });
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${login.body.token}` };

  // ── Cenário A: aparelho em garantia → etiqueta na criação ──
  const a = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devWarranty.id, reportedDefect: "Não liga" }) });
  osWarrantyId = a.body.id || "";
  log(a.status === 201 && (a.body.tags || []).some((t: any) => t.name === "Em Garantia"), "A) OS com aparelho em garantia → etiqueta na criação", `HTTP ${a.status}`);

  // ── Cenário B: aparelho limpo → SEM etiqueta ──
  const b = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devClean.id, reportedDefect: "Risco na tela" }) });
  osCleanId = b.body.id || "";
  log(b.status === 201 && !(b.body.tags || []).some((t: any) => t.name === "Em Garantia"), "B) OS com aparelho sem garantia → SEM etiqueta", `HTTP ${b.status}`);

  // ── Cenário C: retorno dentro da garantia MGV 90 dias ──
  const prior = await p.ordemServico.create({
    data: {
      osNumber: "OS-" + String(900000 + Math.floor(Math.random() * 5000)),
      clientId: client.id, deviceId: devReparo.id,
      reportedDefect: "Primeiro serviço",
      status: "FINALIZADO",
      originalExitDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      warrantyDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000)
    }
  });
  const c = await api("/api/ordens-servico", { method: "POST", headers: auth, body: JSON.stringify({ clientId: client.id, deviceId: devReparo.id, reportedDefect: "Retornou em garantia" }) });
  osReparoId = c.body.id || "";
  if (c.status !== 201) console.log("    ERRO create reparo:", JSON.stringify(c.body).slice(0, 400));
  log(c.status === 201 && (c.body.tags || []).some((t: any) => t.name === "Em Garantia"), "C) Retorno dentro da garantia MGV 90 dias → etiqueta", `HTTP ${c.status}`);

  // ── Listagem: tags nos cards (minimizados) ──
  const list = await api("/api/ordens-servico?pageSize=5000", { headers: auth });
  const items = Array.isArray(list.body.data) ? list.body.data : [];
  const lA = items.find((o: any) => o.id === osWarrantyId);
  const lB = items.find((o: any) => o.id === osCleanId);
  const lC = items.find((o: any) => o.id === osReparoId);
  log(
    list.status === 200 && lA && (lA.tags || []).some((t: any) => t.name === "Em Garantia") &&
    lC && (lC.tags || []).some((t: any) => t.name === "Em Garantia") &&
    lB && !(lB.tags || []).some((t: any) => t.name === "Em Garantia"),
    "Listagem: etiqueta em A e C, ausente em B",
    `HTTP ${list.status}`
  );

  // ── getById (modal maximizado) ──
  const detail = await api(`/api/ordens-servico/${osWarrantyId}`, { headers: auth });
  log(detail.status === 200 && (detail.body.tags || []).some((t: any) => t.name === "Em Garantia"), "getById (maximizado) retorna a etiqueta", `HTTP ${detail.status}`);

  // ── Etiqueta criada como da oficina ──
  const tags = await api("/api/tags?scope=ORDEM_SERVICO", { headers: auth });
  log((tags.body || []).some((t: any) => t.name === "Em Garantia" && t.ownerId === null), "Etiqueta 'Em Garantia' criada (oficina, ownerId null)", `HTTP ${tags.status}`);

  // ── Persistir com tagIds não duplica ──
  const persist = await api(`/api/ordens-servico/${osWarrantyId}`, { method: "PUT", headers: auth, body: JSON.stringify({ diagnostic: "Teste", tagIds: (detail.body.tags || []).map((t: any) => t.id) }) });
  const countGarantia = (persist.body.tags || []).filter((t: any) => t.name === "Em Garantia").length;
  log(persist.status === 200 && countGarantia === 1, "Salvar com tagIds não duplica (1x)", `HTTP ${persist.status}`);
}

async function cleanup() {
  try {
    await p.ordemServico.deleteMany({ where: { id: { in: [osWarrantyId, osCleanId, osReparoId].filter(Boolean) } } });
    await p.ordemServico.deleteMany({ where: { osNumber: { startsWith: "OS-90" } } }); // prior OS
    await p.device.deleteMany({ where: { id: { in: [devWarrantyId, devCleanId, devReparoId].filter(Boolean) } } });
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
