/**
 * Sincroniza o NCM das peças do estoque MGV One Hub com o Bling V3.
 *
 * Para cada peça ativa com NCM válido (8 dígitos):
 *   1. Localiza o produto no Bling pelo `codigo` (part.code).
 *   2. Lê os detalhes e compara o NCM atual do Bling com o do MGV.
 *   3. Se diferente/ausente → PUT /produtos/{id} preservando os campos existentes
 *      e gravando o NCM do MGV.
 *
 * Uso:
 *   tsx scripts/sync_ncm_bling.ts              # DRY-RUN (não altera nada)
 *   tsx scripts/sync_ncm_bling.ts --apply      # aplica as atualizações no Bling
 *   tsx scripts/sync_ncm_bling.ts --limit 20   # processa só as primeiras N peças
 *
 * Resumo + relatório CSV são gravados em ncm_sync_report.csv no diretório de execução.
 */
import "dotenv/config";
import fs from "fs";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();
const DELAY_MS = (() => {
  const i = process.argv.indexOf("--delay");
  return i >= 0 ? Number(process.argv[i + 1]) : 400;
})();

const API = "https://api.bling.com.br/Api/v3";

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

/** Reconstrói o payload preservando os campos existentes do produto e o NCM do MGV.
 *  No Bling V3 o NCM fica dentro de `tributacao.ncm` (confirmado via GET /produtos). */
function buildPayload(d: any, cleanNcm: string, part: any): any {
  const payload: any = {
    nome: d.nome || part.name,
    codigo: d.codigo || part.code,
    tipo: d.tipo || "P",
    formato: d.formato || "S",
    situacao: d.situacao || "A",
    preco: d.preco ?? part.price ?? 0
  };

  // tributacao: preserva o objeto existente e grava apenas o NCM (campo correto do Bling V3)
  const trib = { ...((d.tributacao || {}) as any) };
  trib.ncm = cleanNcm;
  payload.tributacao = trib;

  const preserve = [
    "unidade", "descricaoCurta", "gtin", "gtinEmbalagem", "pesoLiquido", "pesoBruto",
    "dimensoes", "informacoesAdicionais", "origem", "condicao", "volumes", "direito",
    "cor", "marca", "categoria", "fornecedor", "descricaoComplementar", "linkExterno",
    "observacoes", "itensPorCaixa", "dataValidade", "freteGratis", "tipoProducao",
    "artigoPerigoso", "duns", "camposCustomizados", "midia", "linhaProduto",
    "estrutura", "variacoes", "actionEstoque"
  ];
  for (const k of preserve) {
    if (d[k] !== undefined && d[k] !== null) payload[k] = d[k];
  }
  return payload;
}

async function main() {
  const parts = await prisma.part.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" }
  });
  const withNcm = parts.filter((p) => p.ncm && p.ncm.replace(/\D/g, "").length === 8);
  const target = withNcm.slice(0, LIMIT);

  console.log(`\n==============================================`);
  console.log(` SYNC NCM → BLING (${APPLY ? "APLICANDO" : "DRY-RUN"})`);
  console.log(`==============================================`);
  console.log(`Peças ativas: ${parts.length}`);
  console.log(`Com NCM válido: ${withNcm.length}${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ""}`);
  console.log(`Sem NCM/inválido (não processadas): ${parts.length - withNcm.length}`);
  console.log(`Delay entre peças: ${DELAY_MS}ms | Aplicar alterações: ${APPLY}\n`);

  const token = await getAccessToken();
  if (!token) {
    console.error("[ERRO] Não foi possível obter o token do Bling (verifique bling_configs e BLING_CLIENT_ID/SECRET).");
    process.exit(1);
  }

  let found = 0, notFound = 0, alreadyOk = 0, toUpdate = 0, updated = 0, errors = 0;
  let probeDone = false;
  const rows: any[] = [];

  for (const [i, part] of target.entries()) {
    const cleanNcm = part.ncm!.replace(/\D/g, "");
    const code = (part.code || "").trim();
    const status = { code, name: part.name, ncm_mgv: cleanNcm, ncm_bling: "", result: "" };

    try {
      // 1. Busca produto por código
      const search = await retry(() =>
        axios.get(`${API}/produtos`, { params: { codigo: code, limite: 1 }, headers: { Authorization: `Bearer ${token}` } })
      );
      const items = search.data?.data || [];
      if (items.length === 0) {
        notFound++;
        status.result = "NAO_ENCONTRADO";
        rows.push(status);
        await sleep(DELAY_MS);
        continue;
      }
      found++;
      const pid = items[0].id;

      // 2. Detalhes do produto (só da 1ª peça, imprime o schema para conferência)
      const det = await retry(() =>
        axios.get(`${API}/produtos/${pid}`, { headers: { Authorization: `Bearer ${token}` } })
      );
      const d = det.data?.data || {};
      if (!probeDone) {
        probeDone = true;
        console.log(`[PROBE] Produto no Bling (id ${pid}) — NCM fica em tributacao.ncm`);
        console.log(`[PROBE] ncm atual no Bling: "${d.tributacao?.ncm}" | ncm do MGV: "${cleanNcm}"\n`);
      }

      const currentNcm = String(d.tributacao?.ncm || "").replace(/\D/g, "");
      status.ncm_bling = currentNcm || "(vazio)";

      if (currentNcm === cleanNcm) {
        alreadyOk++;
        status.result = "OK";
        rows.push(status);
      } else {
        toUpdate++;
        status.result = APPLY ? "ATUALIZADO" : "PENDENTE";
        rows.push(status);
        if (APPLY) {
          const payload = buildPayload(d, cleanNcm, part);
          await retry(() =>
            axios.put(`${API}/produtos/${pid}`, payload, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } })
          );
          updated++;
        }
      }
    } catch (err: any) {
      errors++;
      status.result = "ERRO";
      status.ncm_bling = err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message;
      rows.push(status);
    }

    await sleep(DELAY_MS);
    if ((i + 1) % 25 === 0 || i === target.length - 1) {
      console.log(`  ... ${i + 1}/${target.length} processadas (encontradas: ${found}, já OK: ${alreadyOk}, a atualizar: ${toUpdate}, erros: ${errors})`);
    }
  }

  console.log(`\n==============================================`);
  console.log(` RESUMO (${APPLY ? "APLICADO" : "DRY-RUN"})`);
  console.log(`==============================================`);
  console.log(`Processadas: ${target.length}`);
  console.log(`Produto encontrado no Bling: ${found}`);
  console.log(`Não encontrado no Bling: ${notFound}`);
  console.log(`NCM já correto no Bling: ${alreadyOk}`);
  console.log(`Com NCM divergente/ausente: ${toUpdate}${APPLY ? ` (${updated} atualizados)` : " (seriam atualizados)"}`);
  console.log(`Erros: ${errors}`);

  // Relatório CSV
  const csv = ["codigo;nome;ncm_mgv;ncm_bling;resultado",
    ...rows.map((r) => `${r.code};${(r.name || "").replace(/;/g, ",")};${r.ncm_mgv};${r.ncm_bling};${r.result}`)
  ].join("\n");
  fs.writeFileSync("ncm_sync_report.csv", csv, "utf8");
  console.log(`\nRelatório detalhado: ncm_sync_report.csv`);

  // Lista dos que seriam/serão atualizados
  const pend = rows.filter((r) => r.result === "PENDENTE" || r.result === "ATUALIZADO");
  if (pend.length > 0) {
    console.log(`\n--- ${pend.length} peças com NCM divergente/ausente ---`);
    pend.slice(0, 60).forEach((r) => console.log(`  ${r.code} | ${r.name.slice(0, 45)} | bling: ${r.ncm_bling} -> ${r.ncm_mgv}`));
    if (pend.length > 60) console.log(`  ... e mais ${pend.length - 60}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[FATAL]", e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
