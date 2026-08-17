/**
 * Importa para o estoque do MGV One Hub (Part) os produtos que existem no Bling
 * mas NÃO existem no MGV (órfãos detectados por scripts/verificar_pecas_bling_sem_mgv.ts).
 *
 * Regras:
 *   - Reexecuta a comparação Bling × MGV (não depende do CSV): lista TODOS os produtos
 *     do Bling, carrega as peças ativas do MGV e importa os que não têm correspondência
 *     por código/nome.
 *   - Campos importados: `code` (codigo do Bling), `name`, `price` (preco do Bling),
 *     `cost` = 0, `stock` = 0, `sku` = "BLING-<id>" (rastreabilidade), `supplier` = "Bling".
 *   - Produtos do Bling SEM código recebem `code = "BLING-<idBling>"` (código sintético,
 *     pois `code` é obrigatório e único no MGV).
 *   - Placeholders de serviço (code começando com `SRV-` ou `AVULSO-`) são importados
 *     marcados como INATIVOS = soft delete (`deletedAt`), que é o mecanismo de "inativo"
 *     do sistema (o modelo Part não possui flag `active`; peças com deletedAt ficam
 *     ocultas do estoque ativo). Use `--manter-placeholders` para importá-los ativos.
 *   - Guarda contra duplicidade: pula se o código já existir no MGV ou se o mesmo código
 *     do Bling aparecer 2× na listagem.
 *
 * Uso:
 *   tsx scripts/importar_orfas_bling.ts               # DRY-RUN (não altera nada)
 *   tsx scripts/importar_orfas_bling.ts --apply       # importa de verdade
 *   tsx scripts/importar_orfas_bling.ts --limit 10    # processa só os primeiros N órfãos
 *   tsx scripts/importar_orfas_bling.ts --manter-placeholders
 *
 * Relatório CSV: orfas_import_report.csv no diretório de execução.
 */
import "dotenv/config";
import fs from "fs";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const MANTER_PLACEHOLDERS = process.argv.includes("--manter-placeholders");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();

const API = "https://api.bling.com.br/Api/v3";
const LIMITE = 100;

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

/** Placeholder de serviço: código com prefixo SRV- ou AVULSO- (não é peça real). */
function isPlaceholder(prod: any): boolean {
  const code = String(prod.codigo ?? "").trim();
  const name = String(prod.nome ?? "");
  return /^(SRV|AVULSO)-/i.test(code) || /^(serviço de manutenção|calibragem)/i.test(name.trim());
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
  console.log(` IMPORTA ÓRFÃOS BLING → ESTOQUE MGV (${APPLY ? "APLICANDO" : "DRY-RUN"})`);
  console.log(`==============================================`);
  console.log(`Peças ativas no MGV: ${parts.length}`);
  console.log(`Placeholders SRV/AVULSO como inativos: ${MANTER_PLACEHOLDERS ? "NÃO (ficam ativos)" : "sim (soft delete)"}`);

  const token = await getAccessToken();
  if (!token) {
    console.error("[ERRO] Não foi possível obter o token do Bling.");
    process.exit(1);
  }

  // 2. Lista todos os produtos do Bling
  const produtos: any[] = [];
  let pagina = 1;
  while (true) {
    const res = await retry(() =>
      axios.get(`${API}/produtos`, {
        params: { pagina, limite: LIMITE },
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    const data = res.data?.data || [];
    produtos.push(...data);
    if (data.length < LIMITE) break;
    pagina++;
    await sleep(250);
  }
  console.log(`Produtos listados no Bling: ${produtos.length}`);

  // 3. Identifica órfãos (mesma lógica do verificar_pecas_bling_sem_mgv.ts)
  const orfaos: any[] = [];
  const vistosPorCodigo = new Set<string>();
  for (const prod of produtos) {
    const codigo = String(prod.codigo ?? "").trim();
    const nome = String(prod.nome ?? "");

    let match = false;
    const codeNorm = norm(codigo);
    if (codeNorm && byCode.has(codeNorm)) match = true;
    else if (codigo.replace(/\D/g, "") && byCodeDigits.has(codigo.replace(/\D/g, ""))) match = true;
    else if (norm(nome) && byName.has(norm(nome))) match = true;

    if (!match) orfaos.push(prod);
  }

  const alvo = orfaos.slice(0, LIMIT);
  console.log(`Órfãos no Bling: ${orfaos.length}${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ""}`);

  // 4. Monta registros e importa
  let importados = 0, inativos = 0, pulados = 0, erros = 0;
  const rows: any[] = [];

  for (const prod of alvo) {
    const idBling = prod.id;
    const nome = String(prod.nome ?? "").trim();
    const codigoOriginal = String(prod.codigo ?? "").trim();
    const preco = typeof prod.preco === "number" ? prod.preco : parseFloat(prod.preco) || 0;
    const unidade = String(prod.unidade ?? "").trim() || "UN";

    // Guarda de duplicidade dentro da própria listagem
    const chaveCodigo = codigoOriginal || `BLING-${idBling}`;
    if (vistosPorCodigo.has(chaveCodigo)) {
      pulados++;
      rows.push({ code: chaveCodigo, nome, result: "CODIGO_DUPLICADO_LISTAGEM" });
      continue;
    }
    vistosPorCodigo.add(chaveCodigo);

    if (!nome) {
      pulados++;
      rows.push({ code: chaveCodigo, nome, result: "SEM_NOME" });
      continue;
    }

    const placeholder = isPlaceholder(prod);
    const code = codigoOriginal || `BLING-${idBling}`;
    const status: any = {
      code,
      nome,
      preco,
      placeholder,
      result: ""
    };

    // Guarda: código já existe no MGV?
    const existente = await prisma.part.findFirst({ where: { code, deletedAt: null } });
    if (existente) {
      pulados++;
      status.result = "JA_EXISTE_MGV";
      rows.push(status);
      continue;
    }

    status.result = APPLY
      ? (placeholder && !MANTER_PLACEHOLDERS ? "IMPORTADO_INATIVO" : "IMPORTADO")
      : (placeholder && !MANTER_PLACEHOLDERS ? "SERIA_INATIVO" : "SERIA_IMPORTADO");
    rows.push(status);

    if (APPLY) {
      try {
        await prisma.part.create({
          data: {
            name: nome,
            code,
            price: preco,
            cost: 0,
            stock: 0,
            unit: unidade,
            sku: `BLING-${idBling}`,
            supplier: "Bling",
            // Placeholders SRV/AVULSO → inativos = soft delete (não aparecem no estoque ativo)
            deletedAt: placeholder && !MANTER_PLACEHOLDERS ? new Date() : null
          }
        });
        if (placeholder && !MANTER_PLACEHOLDERS) inativos++;
        else importados++;
      } catch (err: any) {
        erros++;
        status.result = "ERRO";
        status.erro = err.message?.slice(0, 120);
      }
    }
  }

  console.log(`\n==============================================`);
  console.log(` RESUMO (${APPLY ? "APLICADO" : "DRY-RUN"})`);
  console.log(`==============================================`);
  if (APPLY) {
    console.log(`Importados ativos: ${importados}`);
    console.log(`Importados inativos (placeholders SRV/AVULSO): ${inativos}`);
    console.log(`Pulados (duplicados/sem nome/já existiam): ${pulados}`);
    console.log(`Erros: ${erros}`);
  } else {
    const ativos = rows.filter((r) => r.result === "SERIA_IMPORTADO").length;
    const inat = rows.filter((r) => r.result === "SERIA_INATIVO").length;
    const dup = rows.filter((r) => r.result === "CODIGO_DUPLICADO_LISTAGEM" || r.result === "SEM_NOME" || r.result === "JA_EXISTE_MGV").length;
    console.log(`Seriam importados ativos: ${ativos}`);
    console.log(`Seriam importados inativos (placeholders): ${inat}`);
    console.log(`Pulados: ${dup}`);
  }

  // Relatório CSV
  const csv = [
    "code;nome;preco;placeholder;resultado",
    ...rows.map((r) => `${r.code};${(r.nome || "").replace(/;/g, ",")};${r.preco ?? ""};${r.placeholder ? "sim" : "não"};${r.result}`)
  ].join("\n");
  fs.writeFileSync("orfas_import_report.csv", csv, "utf8");
  console.log(`\nRelatório detalhado: orfas_import_report.csv (${rows.length} linhas)`);

  // Amostra no console
  const pendentes = rows.filter((r) => r.result.startsWith("SERIA") || r.result.startsWith("IMPORTADO"));
  if (pendentes.length > 0) {
    console.log(`\n--- Amostra (${Math.min(pendentes.length, 50)}) ---`);
    pendentes.slice(0, 50).forEach((r) =>
      console.log(`  [${r.result}] ${r.code.padEnd(16)} | R$ ${r.preco ?? "-"} | ${(r.nome || "").slice(0, 55)}`)
    );
    if (pendentes.length > 50) console.log(`  ... e mais ${pendentes.length - 50}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[FATAL]", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
