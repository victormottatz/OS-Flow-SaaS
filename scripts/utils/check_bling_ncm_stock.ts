import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Configurações do Bling
const BLING_TOKEN_URL = "https://api.bling.com.br/Api/v3/oauth/token";
const ARTIFACT_PATH = "C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\e90aa71b-235d-4ad4-95c5-819af3fae8f8\\bling_stock_ncm_audit.md";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Bling OAuth] BLING_CLIENT_ID ou BLING_CLIENT_SECRET não configurados.");
    return null;
  }

  const config = await prisma.blingConfig.findUnique({
    where: { id: 1 },
  });

  if (!config) {
    console.warn("[Bling OAuth] Nenhuma credencial cadastrada na tabela bling_config.");
    return null;
  }

  const bufferTime = new Date(Date.now() + 30000); // 30s buffer
  if (config.expiresAt > bufferTime) {
    return config.accessToken;
  }

  try {
    console.log("[Bling OAuth] Renovando access token expirado...");
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await axios.post(
      BLING_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
          "enable-jwt": "1",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + (expires_in - 60) * 1000);

    await prisma.blingConfig.update({
      where: { id: 1 },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || config.refreshToken,
        expiresAt: expiresAt,
      },
    });

    console.log(`[Bling OAuth] Token renovado com sucesso.`);
    return access_token;
  } catch (err: any) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error(`[Bling OAuth Error] HTTP ${status || "Desconhecido"}:`, JSON.stringify(data || err.message));
    return null;
  }
}

async function requestWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err.response?.status === 429 && retries > 0) {
      console.warn(`[Bling Rate Limit] Código 429. Aguardando ${delay}ms para tentar novamente... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return requestWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

async function main() {
  console.log("Iniciando auditoria de estoque e NCM no Bling (modo sequencial otimizado)...");
  const token = await getAccessToken();
  if (!token) {
    console.error("Não foi possível obter o token de acesso do Bling.");
    process.exit(1);
  }

  // 1. Obter todos os produtos ativos do Bling de forma paginada
  console.log("Buscando lista de produtos ativos cadastrados no Bling...");
  const allBlingProducts: any[] = [];
  let page = 1;
  while (true) {
    try {
      const response = await requestWithRetry(() => axios.get("https://api.bling.com.br/Api/v3/produtos", {
        params: { pagina: page, limite: 100, criterio: 1 }, // 1 = Ativos
        headers: { Authorization: `Bearer ${token}` }
      }));
      const data = response.data?.data || [];
      if (data.length === 0) break;
      allBlingProducts.push(...data);
      console.log(`Página ${page}: ${data.length} produtos carregados.`);
      page++;
      // Atraso seguro entre requisições de página
      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (err: any) {
      console.error(`Erro ao buscar produtos da página ${page}:`, err.response?.data || err.message);
      break;
    }
  }

  console.log(`Total de produtos ativos encontrados no Bling: ${allBlingProducts.length}`);

  // 2. Buscar detalhes de cada produto de forma sequencial com delay fixo para evitar 429
  console.log("Buscando detalhes de NCM e tributação de forma sequencial...");
  const detailedProducts: any[] = [];
  
  for (let i = 0; i < allBlingProducts.length; i++) {
    const prod = allBlingProducts[i];
    
    if ((i + 1) % 50 === 0 || i === 0 || i === allBlingProducts.length - 1) {
      console.log(`Progresso: Buscando detalhes do produto ${i + 1} de ${allBlingProducts.length}...`);
    }

    try {
      const detailResponse = await requestWithRetry(() => axios.get(`https://api.bling.com.br/Api/v3/produtos/${prod.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }));
      const fullProd = detailResponse.data?.data;
      if (fullProd) {
        detailedProducts.push(fullProd);
      }
    } catch (err: any) {
      console.error(`Falha ao carregar detalhes do produto ID ${prod.id} (${prod.nome}):`, err.message);
      detailedProducts.push(prod); // Fallback para manter na lista com dados básicos
    }

    // Delay de 350ms entre chamadas individuais (garante taxa < 3 req/s)
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  console.log(`Carregados detalhes de ${detailedProducts.length} produtos.`);

  // 3. Buscar todas as peças locais do MGV para comparação de estoque e NCM
  console.log("Carregando peças da base de dados local do MGV...");
  const localParts = await prisma.part.findMany({
    where: { deletedAt: null }
  });

  const localPartsMap = new Map<string, typeof localParts[0]>();
  for (const part of localParts) {
    if (part.code) {
      localPartsMap.set(part.code.trim().toUpperCase(), part);
    }
  }

  // 4. Analisar dados
  const noNcmList: any[] = [];
  const stockDivergencies: any[] = [];
  const correctList: any[] = [];
  let totalBlingStock = 0;

  for (const prod of detailedProducts) {
    const sku = (prod.codigo || "").trim();
    const nome = prod.nome || "Sem nome";
    const blingStock = prod.estoque?.saldoVirtualTotal ?? 0;
    totalBlingStock += blingStock;

    // Verificar NCM
    const ncm = (prod.tributacao?.ncm || "").replace(/\D/g, "");
    const hasNcm = ncm.length > 0;

    const localPart = sku ? localPartsMap.get(sku.toUpperCase()) : null;
    const localStock = localPart ? localPart.stock : null;
    const localNcm = localPart ? (localPart.ncm || "").replace(/\D/g, "") : null;

    if (!hasNcm) {
      noNcmList.push({
        id: prod.id,
        sku,
        nome,
        blingStock,
        localStock,
        localNcm: localPart ? localPart.ncm : "Não cadastrado localmente"
      });
    } else {
      correctList.push({
        id: prod.id,
        sku,
        nome,
        ncm: prod.tributacao.ncm,
        blingStock
      });
    }

    // Verificar divergência de estoque
    if (localStock !== null && localStock !== blingStock) {
      stockDivergencies.push({
        id: prod.id,
        sku,
        nome,
        blingStock,
        localStock,
        diff: blingStock - localStock
      });
    }
  }

  // 5. Escrever Relatório em Markdown
  console.log(`Escrevendo relatório em ${ARTIFACT_PATH}...`);
  const timestamp = new Date().toLocaleString("pt-BR");
  
  let mdContent = `# Relatório de Auditoria — Bling ERP vs MGV Local
*Gerado em: ${timestamp}*

## 📊 Resumo Executivo
| Métrica | Quantidade | Observação |
| :--- | :---: | :--- |
| **Total de Produtos Ativos no Bling** | **${detailedProducts.length}** | Cadastrados na API V3 do Bling |
| **Produtos com NCM Preenchido** | **${correctList.length}** | Com código NCM fiscal ativo |
| **Produtos SEM NCM (Crítico)** | **${noNcmList.length}** | Requerem atenção fiscal imediata |
| **Soma Total de Estoque no Bling** | **${totalBlingStock} un** | Saldo virtual somado de todos os itens |
| **Divergências de Estoque (Bling vs Local)** | **${stockDivergencies.length}** | Diferença entre estoque local MGV e Bling |

---

## 🚨 Produtos Sem NCM (${noNcmList.length} itens)
Estes produtos estão cadastrados no Bling, mas não possuem a NCM preenchida. A ausência de NCM impedirá o faturamento automático de Ordens de Serviço ou a emissão de notas fiscais de venda para esses itens.

| ID Bling | SKU / Código | Descrição do Produto | Estoque Bling | Estoque MGV | NCM no MGV Local |
| :--- | :--- | :--- | :---: | :---: | :--- |
${noNcmList.length === 0 ? "| - | - | Nenhum produto sem NCM encontrado! | - | - | - |\n" : noNcmList.map(p => `| \`${p.id}\` | \`${p.sku || "SEM SKU"}\` | ${p.nome} | **${p.blingStock}** | ${p.localStock !== null ? p.localStock : "N/A"} | ${p.localNcm || "Sem NCM"} |`).join("\n")}

---

## 🔄 Divergências de Estoque (MGV vs Bling) (${stockDivergencies.length} itens)
Itens em que a quantidade física registrada no banco de dados local do MGV não coincide com o estoque virtual no Bling ERP.

| SKU / Código | Descrição do Produto | Estoque Bling | Estoque MGV Local | Divergência | Ação Sugerida |
| :--- | :--- | :---: | :---: | :---: | :--- |
${stockDivergencies.length === 0 ? "| - | - | Nenhuma divergência de estoque encontrada! | - | - | - |\n" : stockDivergencies.map(d => `| \`${d.sku || "SEM SKU"}\` | ${d.nome} | **${d.blingStock}** | **${d.localStock}** | ${d.diff > 0 ? `+${d.diff}` : d.diff} | ${d.diff > 0 ? "Bling possui mais itens. Sincronizar estoque local" : "MGV possui mais itens. Sincronizar estoque no Bling"} |`).join("\n")}

---

## 🔍 Detalhes dos Produtos com NCM OK (${correctList.length} itens)
Exibição simplificada dos produtos ativos corretos.

<details>
<summary>Clique para expandir a lista de produtos regulares</summary>

| ID Bling | SKU | Descrição | NCM | Estoque Bling |
| :--- | :--- | :--- | :--- | :---: |
${correctList.map(c => `| \`${c.id}\` | \`${c.sku || "SEM SKU"}\` | ${c.nome} | \`${c.ncm}\` | **${c.blingStock}** |`).join("\n")}

</details>

---
*Fim do relatório de auditoria.*
`;

  try {
    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, mdContent, "utf-8");
    console.log("Relatório gravado com sucesso!");
  } catch (err: any) {
    console.error("Erro ao gravar arquivo de relatório:", err.message);
  }

  // Imprime sumário executivo curto no console
  console.log("\n=================== RESULTADOS DA AUDITORIA ===================");
  console.log(`Total de produtos ativos no Bling: ${detailedProducts.length}`);
  console.log(`Produtos com NCM: ${correctList.length}`);
  console.log(`Produtos SEM NCM: ${noNcmList.length}`);
  console.log(`Divergências de estoque: ${stockDivergencies.length}`);
  console.log("=============================================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
