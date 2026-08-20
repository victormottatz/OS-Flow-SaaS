import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`http://localhost:3000${path}`, opts);
  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch {}
  return { status: res.status, body };
}

async function main() {
  const password = "Diag#ClientTags2026!";
  const owner = await p.user.create({
    data: { name: "Diag ClientTags", email: `diagct.${Date.now()}@mgvteste.com.br`, passwordHash: await bcrypt.hash(password, 10), role: "OWNER" }
  });
  const client = await p.client.create({
    data: { name: "Cliente Diag CT", cpfCnpj: "52998224725", phone: "16999999999", email: `dct.${Date.now()}@teste.com`, address: "Rua Teste, 123" }
  });
  const tag = await p.tag.create({
    data: { name: "VIP Diag", colorHex: "#f59e0b", scope: "CLIENT", ownerId: null }
  });
  await p.client.update({ where: { id: client.id }, data: { tags: { connect: [{ id: tag.id }] } } });

  const login = await api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: owner.email, password }) });
  const auth = { Authorization: `Bearer ${login.body.token}` };

  const detail = await api(`/api/clients/${client.id}`, { headers: auth });
  console.log("GET /api/clients/:id HTTP:", detail.status);
  console.log("Chaves do corpo:", Object.keys(detail.body).slice(0, 30).join(", "));
  console.log("body.tags:", JSON.stringify(detail.body.tags));

  const rel = await p.client.findUnique({
    where: { id: client.id },
    include: { tags: { include: { owner: { select: { id: true, name: true } } } } }
  });
  console.log("Prisma direto tags:", JSON.stringify((rel as any)?.tags?.map((t: any) => t.name)));

  await p.client.delete({ where: { id: client.id } }).catch(() => {});
  await p.tag.delete({ where: { id: tag.id } }).catch(() => {});
  await p.user.delete({ where: { id: owner.id } }).catch(() => {});
}

main().catch(e => console.log("ERRO:", e.message)).finally(async () => { await p.$disconnect(); process.exit(0); });
