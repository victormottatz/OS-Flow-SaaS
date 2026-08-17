/**
 * Verifica quais produtos existem no Bling mas NÃO existem no estoque do MGV One Hub.
 *
 * Fluxo (somente leitura — NÃO altera nada):
 *   1. Carrega todos os códigos/nomes de peças ativas do MGV.
 *   2. Lista TODOS os produtos do Bling V3 (GET /produtos paginado, 100/página).
 *   3. Compara por `codigo` (normalizado: sem espaços/caixa) e por nome normalizado.
 *   4. Gera relatório CSV (bling_orfas_report.csv) + resumo no console.
 *
 * Uso:
 *   tsx scripts/verificar_pecas_bling_sem_mgv.ts
 *   tsx scripts/verificar_pecas_bling_sem_mgv.ts --limit-pages 5   (teste rápido)
 */
import "dotenv/config";
import fs from "fs";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const API = "https://api.bling.com.br/Api/v3";
const LIMITE = 100;
const LIMIT_PAGES = (() => {
  const i = process.argv.indexOf("--limit-pages");
  return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();

/** Busca o access token no blingConfig, renovando via refresh_token se necessário. */
async function getAccessToken(): Promise<string | null> {
  const config = await prisma.blingConfig.findUnique({ where: { id: 1 } });
  if (!config?.accessToken) return null;

  if (config.expiresAt && new Date(config.expiresAt) > new Date(Date.now() + 30000)) {
    return config.accessToken;
  }
  if (!config.refreshToken || !process.env.BLING_CLIENT_ID || !process.env.BLING_CLIENT_SECRET) {
    return null;
  }

  const credentials = Buffer.from(
    `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    `${API}/oauth/token`,
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: config.refreshToken }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}`, "enable-jwt": "1" } }
  );
  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + (expires_in - 60) * 1000);
  await prisma.blingConfig.update({
    where: { id: 1 },
    data: { accessToken: access_token, refreshToken: refresh_token || config.refreshToken, expiresAt }
  });
  return access_token;
}

/** Executa com backoff exponencial em 429 (rate limit do Bling). */
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err.response?.status === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return retry(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normaliza para comparação: minúsculas, sem acentos, sem espaços/pontuação. */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function main() {
  // 1. Base do MGV
  const parts = await prisma.part.findMany({ where: { deletedAt: null } });
  const byCode = new Map<string, any>();
  const byCodeDigits = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const p of parts) {
    const code = (p.code || "").trim();
    if (code) {
      byCode.set(norm(code), p);
      byCodeDigits.set(code.replace(/\D/g, ""), p);
    }
    const name = norm(p.name || "");
    if (name) byName.set(name, p);
  }

  console.log(`\n==============================================`);
  console.log(` VERIFICAÇÃO: PRODUTOS NO BLING QUE NÃO EXISTEM NO MGV`);
  console.log(`==============================================`);
  console.log(`Peças ativas no MGV: ${parts.length}`);

  const token = await getAccessToken();
  if (!token) {
    console.error("[ERRO] Não foi possível obter o token do Bling.");
    process.exit(1);
  }

  // 2. Lista paginada de todos os produtos do Bling
  const produtos: any[] = [];
  let pagina = 1;
  let total = null;
  while (true) {
    const res = await retry(() =>
      axios.get(`${API}/produtos`, {
        params: { pagina, limite: LIMITE },
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    const data = res.data?.data || [];
    const paginacao = res.data?.paginacao || {};
    if (total === null && paginacao.total != null) total = paginacao.total;
    produtos.push(...data);
    console.log(`  ... página ${pagina} (${data.length} itens)${total != null ? ` — total informado: ${total}` : ""}`);

    if (data.length < LIMITE) break;
    if (pagina >= LIMIT_PAGES) break;
    pagina++;
    await sleep(250);
  }

  console.log(`Produtos listados no Bling: ${produtos.length}${total != null && total > produtos.length ? ` (de ${total} informados)` : ""}`);

  // 3. Comparação
  const orfaos: any[] = [];
  const correspondentes: any[] = [];
  for (const prod of produtos) {
    const codigo = String(prod.codigo ?? "").trim();
    const nome = String(prod.nome ?? "");
    const tipo = String(prod.tipo ?? ""); // P = produto, S = serviço
    const situacao = String(prod.situacao ?? ""); // A = ativo, I = inativo

    let match: any = null;
    let matchTipo = "";
    const codeNorm = norm(codigo);

    if (codeNorm && byCode.has(codeNorm)) {
      match = byCode.get(codeNorm);
      matchTipo = "CODIGO";
    } else if (codigo.replace(/\D/g, "") && byCodeDigits.has(codigo.replace(/\D/g, ""))) {
      match = byCodeDigits.get(codigo.replace(/\D/g, ""));
      matchTipo = "CODIGO_SEM_FORMATACAO";
    } else {
      const nameNorm = norm(nome);
      if (nameNorm && byName.has(nameNorm)) {
        match = byName.get(nameNorm);
        matchTipo = "NOME";
      }
    }

    if (match) {
      correspondentes.push({ prod, match, matchTipo });
    } else {
      orfaos.push({ codigo, nome, tipo, situacao, preco: prod.preco, id: prod.id });
    }
  }

  const orfaosAtivos = orfaos.filter((o) => o.situacao !== "I");
  const servicos = orfaos.filter((o) => o.tipo === "S");

  console.log(`\n==============================================`);
  console.log(` RESULTADO`);
  console.log(`==============================================`);
  console.log(`Correspondem a peças do MGV: ${correspondentes.length}`);
  console.log(`NÃO existem no MGV (órfãos): ${orfaos.length}`);
  console.log(`  ├─ ativos: ${orfaosAtivos.length}`);
  console.log(`  ├─ inativos: ${orfaos.length - orfaosAtivos.length}`);
  console.log(`  └─ classificados como serviço (tipo S): ${servicos.length}`);

  // 4. Relatório CSV
  const csv = [
    "codigo_bling;nome_bling;tipo;situacao;preco;id_bling",
    ...orfaos.map((o) => `${o.codigo};${(o.nome || "").replace(/;/g, ",")};${o.tipo};${o.situacao};${o.preco ?? ""};${o.id}`)
  ].join("\n");
  fs.writeFileSync("bling_orfas_report.csv", csv, "utf8");
  console.log(`\nRelatório detalhado: bling_orfas_report.csv (${orfaos.length} linhas)`);

  // 5. Amostra no console (ativos primeiro)
  if (orfaos.length > 0) {
    const amostra = [...orfaosAtivos, ...orfaos.filter((o) => o.situacao === "I")].slice(0, 80);
    console.log(`\n--- Amostra dos ${amostra.length} primeiros órfãos ---`);
    amostra.forEach((o) =>
      console.log(`  ${o.codigo.padEnd(14)} | ${(o.nome || "").slice(0, 50).padEnd(50)} | ${o.tipo} | ${o.situacao} | R$ ${o.preco ?? "-"}`)
    );
    if (orfaos.length > 80) console.log(`  ... e mais ${orfaos.length - 80}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[FATAL]", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
