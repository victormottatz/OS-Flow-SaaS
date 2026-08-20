/**
 * Teste temporário — fluxo backend de etiquetas via API real (porta 3001).
 * Cria usuários temporários, autentica, cria/edita/exclui etiquetas e limpa tudo.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3001";
const p = new PrismaClient();

let technicianId = "";
let ownerId = "";
let techTagId = "";
let officeTagId = "";

function log(ok: boolean, label: string, extra?: string) {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra ? " — " + extra : ""}`);
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const password = "Etiqueta#Teste2026!";

  // 1) Cria usuários temporários (não-manager e OWNER)
  const tech = await p.user.create({
    data: {
      name: "API Test Technician",
      email: `api.tech.${Date.now()}@mgvteste.com.br`,
      passwordHash: await bcrypt.hash(password, 10),
      role: "TECHNICIAN"
    }
  });
  const owner = await p.user.create({
    data: {
      name: "API Test Owner",
      email: `api.owner.${Date.now()}@mgvteste.com.br`,
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER"
    }
  });
  technicianId = tech.id;
  ownerId = owner.id;
  log(true, `Usuários temporários criados (tech=${tech.email}, owner=${owner.email})`);

  // 2) Login real via API
  const loginTech = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: tech.email, password })
  });
  log(loginTech.status === 200 && !!loginTech.body.token, "Login TECHNICIAN via API", `HTTP ${loginTech.status}`);
  if (!loginTech.body.token) throw new Error("Falha no login do technician");

  const loginOwner = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: owner.email, password })
  });
  log(loginOwner.status === 200 && !!loginOwner.body.token, "Login OWNER via API", `HTTP ${loginOwner.status}`);
  if (!loginOwner.body.token) throw new Error("Falha no login do owner");

  const techAuth = { Authorization: `Bearer ${loginTech.body.token}` };
  const ownerAuth = { Authorization: `Bearer ${loginOwner.body.token}` };

  // 3) Criação rápida como TECHNICIAN (sem `global` → deve virar etiqueta PESSOAL)
  const createTech = await api("/api/tags", {
    method: "POST",
    headers: techAuth,
    body: JSON.stringify({ name: "Urgente API", colorHex: "#ef4444", scope: "ORDEM_SERVICO" })
  });
  techTagId = createTech.body.id || "";
  log(
    createTech.status === 200 && techTagId && createTech.body.ownerId === technicianId,
    "Criação rápida TECHNICIAN cria etiqueta PESSOAL (ownerId = usuário)",
    `HTTP ${createTech.status}, ownerId=${createTech.body.ownerId}`
  );

  // 4) Criação como OWNER com global:true → etiqueta da OFICINA (ownerId null)
  const createOffice = await api("/api/tags", {
    method: "POST",
    headers: ownerAuth,
    body: JSON.stringify({ name: "Garantia API", colorHex: "#22c55e", scope: "CLIENT", global: true })
  });
  officeTagId = createOffice.body.id || "";
  log(
    createOffice.status === 200 && officeTagId && createOffice.body.ownerId === null,
    "Criação OWNER com global:true cria etiqueta da OFICINA (ownerId null)",
    `HTTP ${createOffice.status}`
  );

  // 5) GET filtrando por escopo — technician vê a própria + as da oficina
  const listTech = await api("/api/tags?scope=ORDEM_SERVICO", { headers: techAuth });
  const techVisible = Array.isArray(listTech.body) && listTech.body.some((t: any) => t.id === techTagId);
  log(listTech.status === 200 && techVisible, "GET /api/tags?scope=ORDEM_SERVICO expõe etiqueta pessoal", `HTTP ${listTech.status}`);

  const listOfficeVisible = await api("/api/tags?scope=CLIENT", { headers: techAuth });
  const officeVisible = Array.isArray(listOfficeVisible.body) && listOfficeVisible.body.some((t: any) => t.id === officeTagId);
  log(listOfficeVisible.status === 200 && officeVisible, "TECHNICIAN vê etiquetas da OFICINA de outro escopo", `HTTP ${listOfficeVisible.status}`);

  // 6) Permissão: technician NÃO pode editar etiqueta da oficina → 403
  const denyEdit = await api(`/api/tags/${officeTagId}`, {
    method: "PUT",
    headers: techAuth,
    body: JSON.stringify({ name: "HACK" })
  });
  log(denyEdit.status === 403, "TECHNICIAN bloqueado ao editar etiqueta da oficina (403)", `HTTP ${denyEdit.status}`);

  // 7) Technician edita a PRÓPRIA etiqueta → 200
  const editOwn = await api(`/api/tags/${techTagId}`, {
    method: "PUT",
    headers: techAuth,
    body: JSON.stringify({ description: "Prioridade máxima" })
  });
  log(editOwn.status === 200 && editOwn.body.description === "Prioridade máxima", "TECHNICIAN edita própria etiqueta", `HTTP ${editOwn.status}`);

  // 8) OWNER vê tudo (pessoais + oficina)
  const listOwner = await api("/api/tags", { headers: ownerAuth });
  const ownerSeesAll = Array.isArray(listOwner.body) &&
    listOwner.body.some((t: any) => t.id === techTagId) &&
    listOwner.body.some((t: any) => t.id === officeTagId);
  log(listOwner.status === 200 && ownerSeesAll, "OWNER enxerga todas as etiquetas", `HTTP ${listOwner.status}`);

  // 9) Sem token → criação negada (401)
  const noAuth = await api("/api/tags", {
    method: "POST",
    body: JSON.stringify({ name: "Inválida", colorHex: "#000000", scope: "GLOBAL" })
  });
  log(noAuth.status === 401, "Criação sem token é rejeitada (401)", `HTTP ${noAuth.status}`);
}

async function cleanup() {
  try {
    if (techTagId) await fetch(`${BASE}/api/tags/${techTagId}`, { method: "DELETE", headers: { Authorization: `Bearer ${process.env.TECH_TOKEN || ""}` } }).catch(() => {});
    if (officeTagId) await fetch(`${BASE}/api/tags/${officeTagId}`, { method: "DELETE", headers: { Authorization: `Bearer ${process.env.OWNER_TOKEN || ""}` } }).catch(() => {});
  } catch {}
  // Fallback: remove qualquer etiqueta de teste que tenha sobrado
  try {
    await p.tag.deleteMany({
      where: { name: { in: ["Urgente API", "Garantia API"] } }
    });
  } catch {}
  try {
    if (technicianId) await p.user.delete({ where: { id: technicianId } });
    if (ownerId) await p.user.delete({ where: { id: ownerId } });
    log(true, "Limpeza concluída (usuários e etiquetas de teste removidos)");
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
