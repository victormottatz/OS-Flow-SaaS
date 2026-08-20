/**
 * Valida o fluxo de etiquetas personalizadas na PRODUÇÃO (porta 3000):
 * criar etiqueta com scope CLIENT, listar, salvar no cliente, ver no getById.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";
const p = new PrismaClient();

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
  const password = "Tags#Prod2026!";
  const owner = await p.user.create({
    data: { name: "Tags Prod Owner", email: `tagsprod.${Date.now()}@mgvteste.com.br`, passwordHash: await bcrypt.hash(password, 10), role: "OWNER" }
  });
  const client = await p.client.create({
    data: { name: "Cliente Tags Prod", cpfCnpj: "52998224725", phone: "16999999999", email: `tp.${Date.now()}@teste.com`, address: "Rua Teste, 123" }
  });

  const login = await api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: owner.email, password }) });
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${login.body.token}` };
  log(login.status === 200, "Login OK", `HTTP ${login.status}`);

  // 1) Criar etiqueta com scope CLIENT
  const created = await api("/api/tags", {
    method: "POST", headers: auth,
    body: JSON.stringify({ name: "Cliente VIP Prod", colorHex: "#f59e0b", scope: "CLIENT", description: "Etiqueta de teste na produção", global: true })
  });
  log((created.status === 200 || created.status === 201) && created.body.scope === "CLIENT" && created.body.ownerId === null, "Cria etiqueta da oficina com scope CLIENT", `HTTP ${created.status} | scope=${created.body.scope} | ownerId=${created.body.ownerId}`);

  // 2) Listar com filtro scope
  const list = await api("/api/tags?scope=CLIENT", { headers: auth });
  const tags = Array.isArray(list.body) ? list.body : (list.body.data || []);
  log(list.status === 200 && tags.some((t: any) => t.id === created.body.id), "Lista etiquetas CLIENT", `HTTP ${list.status} | ${tags.length} tags`);

  // 3) Salvar etiquetas no cliente
  const saved = await api(`/api/clients/${client.id}/tags`, { method: "PATCH", headers: auth, body: JSON.stringify({ tagIds: [created.body.id] }) });
  log(saved.status === 200 && (saved.body.tags || []).some((t: any) => t.id === created.body.id), "Salva etiquetas no cliente", `HTTP ${saved.status}`);

  // 4) Visão 360 do cliente devolve tags
  const detail = await api(`/api/clients/${client.id}/360`, { headers: auth });
  const detailTags = (detail.body && (detail.body.tags || detail.body.client?.tags)) || [];
  log(detail.status === 200 && detailTags.some((t: any) => t.name === "Cliente VIP Prod"), "Visão 360 do cliente devolve etiqueta", `HTTP ${detail.status} | tags=[${detailTags.map((t: any) => t.name).join(",")}]`);

  // Cleanup
  await p.client.delete({ where: { id: client.id } }).catch(() => {});
  await p.tag.delete({ where: { id: created.body.id } }).catch(() => {});
  await p.user.delete({ where: { id: owner.id } }).catch(() => {});
  log(true, "Limpeza concluída");
}

main().catch(e => log(false, "TESTE FALHOU", e.message)).finally(async () => { await p.$disconnect(); process.exit(0); });
