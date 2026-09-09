/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import prisma from "../database/prisma";

// Mutex para impedir renovação concorrente do token OAuth do Bling em requisições paralelas
let refreshPromiseMutex: Promise<string | null> | null = null;

// Interface para o payload do produto no Bling
export interface BlingProductPayload {
  nome: string;
  codigo: string;
  preco: number;
  tipo: "P" | "S"; // Produto ou Serviço
  formato: "S" | "V" | "E"; // Simples, Com variação, Com composição
  situacao: "A" | "I"; // Ativo ou Inativo
  unidade?: string;
  ncm?: string;
  tributacao?: {
    cfop: string;
    csosn: string;
  };
}

const BLING_TOKEN_URL = "https://api.bling.com.br/Api/v3/oauth/token";

interface BlingTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
}

/**
 * Mask token strings for secure logging
 */
function maskToken(token: string): string {
  if (!token) return "empty";
  if (token.length <= 8) return "***";
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

/**
 * Executes a request with exponential backoff on 429 Too Many Requests.
 */
async function requestWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err.response?.status === 429 && retries > 0) {
      console.warn(`[Bling Rate Limit] Código 429 (Too Many Requests). Aguardando ${delay}ms para tentar novamente... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return requestWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

/**
 * Exchange Authorization Code for Access & Refresh Tokens.
 * Securely saves them in the BlingConfig Supabase database table.
 */
export async function exchangeCode(code: string): Promise<string> {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("[Bling OAuth] BLING_CLIENT_ID ou BLING_CLIENT_SECRET não configurados no ambiente.");
  }

  // Basic Auth header value: base64(client_id:client_secret)
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await axios.post<BlingTokenResponse>(
      BLING_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
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
    
    // Calculate expiration time (adding a 1-minute safety buffer)
    const expiresAt = new Date(Date.now() + (expires_in - 60) * 1000);

    // Salva ou atualiza a configuração do Bling
    let existingConfig = await prisma.blingConfig.findFirst();
    if (existingConfig) {
      await prisma.blingConfig.update({
        where: { id: existingConfig.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expiresAt,
        },
      });
    } else {
      const defaultCompany = await prisma.company.findFirst();
      await prisma.blingConfig.create({
        data: {
          companyId: defaultCompany?.id || null,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expiresAt,
        },
      });
    }

    console.log(`[Bling OAuth] Authorization code trocado e salvo com sucesso. Expira em: ${expiresAt.toISOString()}`);
    return access_token;
  } catch (err: any) {
    const status = err.response?.status;
    const data = err.response?.data;
    const msg = `HTTP ${status || "Desconhecido"}: ${JSON.stringify(data || err.message)}`;
    console.error("[Bling OAuth Error] Erro ao trocar authorization code:", msg);
    throw new Error(`Erro na troca de código com o Bling: ${msg}`);
  }
}

/**
 * Retrieve active Access Token, automatically executing OAuth refresh logic
 * with mutex protection to prevent race conditions on concurrent API calls.
 */
export async function getAccessToken(companyId?: string): Promise<string | null> {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Bling OAuth] BLING_CLIENT_ID ou BLING_CLIENT_SECRET não configurados no ambiente.");
    return null;
  }

  // 1. Fetch current config from Supabase/Postgres
  const config = companyId
    ? await prisma.blingConfig.findFirst({ where: { companyId } })
    : await prisma.blingConfig.findFirst();

  if (!config) {
    console.warn("[Bling OAuth] Integração Bling pendente: nenhuma credencial cadastrada na tabela bling_configs.");
    return null;
  }

  // 2. Check if token is still valid (not expired, and not expiring in the next 30 seconds)
  const bufferTime = new Date(Date.now() + 30000); // 30s buffer

  if (config.expiresAt > bufferTime) {
    return config.accessToken;
  }

  // 3. Se uma renovação de token já estiver em andamento por outra requisição, reutiliza a Promise (Mutex)
  if (refreshPromiseMutex) {
    console.log("[Bling OAuth] Reutilizando renovação de token já em andamento (Mutex)...");
    return refreshPromiseMutex;
  }

  // Executa a renovação isolada com trava
  refreshPromiseMutex = (async () => {
    try {
      console.log(`[Bling OAuth] Access token expirado ou prestes a expirar. Iniciando renovação automática...`);
      console.log(`[Bling OAuth] Refresh token atual: ${maskToken(config.refreshToken)}`);

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const response = await axios.post<BlingTokenResponse>(
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
        where: { id: config.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || config.refreshToken,
          expiresAt: expiresAt,
        },
      });

      console.log(`[Bling OAuth] Token renovado com sucesso. Novo vencimento: ${expiresAt.toISOString()}`);
      return access_token;
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = `HTTP ${status || "Desconhecido"}: ${JSON.stringify(data || err.message)}`;
      console.error("[Bling OAuth Error] Erro ao renovar o access token:", msg);
      return null;
    } finally {
      refreshPromiseMutex = null;
    }
  })();

  return refreshPromiseMutex;
}

/**
 * Sincroniza um cliente (contato) local com o Bling V3.
 * Retorna o ID do contato no Bling.
 */
export async function syncClientToBling(client: {
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  address: string;
  rg?: string; // Tabela Client.rg armazena IE/RG no banco local
  stateInscription?: string;
  icmsContribuinteType?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  syncClientWithErp?: boolean;
}): Promise<number> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Não foi possível obter um token válido para o Bling.");
  }

  const documentSanitized = client.cpfCnpj.replace(/\D/g, "");

  // 1. Search for existing contact by document
  let contactId: number | null = null;
  if (documentSanitized.length > 0) {
    try {
      const searchResponse = await requestWithRetry(() => axios.get(
        "https://api.bling.com.br/Api/v3/contatos",
        {
          params: { numeroDocumento: documentSanitized, limite: 1 },
          headers: { Authorization: `Bearer ${token}` }
        }
      ));
      const existing = searchResponse.data?.data || [];
      if (existing.length > 0) {
        contactId = existing[0].id;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`[Bling Sync] Erro ao buscar contato por documento ${documentSanitized}:`, errorMsg);
    }
  }

  // Parse Address string de forma resiliente
  let logradouro = "Não informado";
  let numero = "S/N";
  let bairro = "Centro";
  
  // Usar campos diretos do cliente, se disponíveis
  let cep = (client.zipCode || "").replace(/\D/g, "") || "14000000"; 
  let municipio = client.city || "Ribeirão Preto";
  let uf = client.state || "SP";

  const rawAddress = client.address || "";

  try {
    // 1. Extrair CEP (formato XXXXX-XXX ou XXXXXXXX) se não fornecido
    if (!client.zipCode) {
      const cepMatch = rawAddress.match(/\b\d{5}-?\d{3}\b/);
      if (cepMatch) {
        cep = cepMatch[0].replace(/\D/g, "");
      }
    }

    // 2. Extrair UF/Estado se não fornecido
    if (!client.state) {
      const ufMatch = rawAddress.match(/[\/,\-\s]\s*([A-Za-z]{2})\b/);
      if (ufMatch) {
        const parsedUf = ufMatch[1].toUpperCase();
        const validUfs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
        if (validUfs.includes(parsedUf)) {
          uf = parsedUf;
        }
      }
    }

    // 3. Extrair Município se não fornecido
    if (!client.city) {
      const cityMatch = rawAddress.match(/([^,\-\/]+)\s*[\/-]\s*([A-Za-z]{2})\b/);
      if (cityMatch) {
        const potentialCity = cityMatch[1].trim();
        if (potentialCity.length > 2 && potentialCity.toUpperCase() !== "BAIRRO") {
          municipio = potentialCity;
        }
      }
    }

    // 4. Extrair Logradouro e Número dividindo por vírgula
    const commaParts = rawAddress.split(",");
    if (commaParts.length > 0) {
      logradouro = commaParts[0].trim() || "Não informado";
      
      // Tentar encontrar número na segunda parte
      if (commaParts.length > 1) {
        const potentialNumSec = commaParts[1].trim().split(/\s+/)[0];
        const numClean = potentialNumSec.replace(/\D/g, "");
        if (numClean && numClean.length > 0) {
          numero = numClean;
        } else if (potentialNumSec.toLowerCase() === "s/n" || potentialNumSec.toLowerCase() === "sn") {
          numero = "S/N";
        }
      }
    }

    // 5. Extrair Bairro
    const bairroMatch = rawAddress.match(/Bairro\s+([^,\-\/]+)/i) || rawAddress.match(/-\s*([^,\-\/]+)\s*-/);
    if (bairroMatch) {
      bairro = bairroMatch[1].trim();
    } else if (commaParts.length > 2) {
      bairro = commaParts[2].trim().split(/[\-\/]/)[0].trim() || "Centro";
    }
  } catch (e) {
    console.warn("[Bling Sync] Erro no parsing de endereço, utilizando fallbacks:", e);
  }

  // Sanitização final de telefones e nomes
  const phoneSanitized = client.phone.replace(/\D/g, "").substring(0, 11);
  const nameSanitized = client.name.trim().replace(/\s{2,}/g, " ");

  // Classificação do Tipo de Contribuinte de ICMS
  let contribuinte = "9";
  let ie = "";

  if (documentSanitized.length > 11) {
    // Jurídica
    const ieRaw = (client.rg || client.stateInscription || "").trim().toUpperCase();
    if (ieRaw && ieRaw !== "ISENTO" && ieRaw !== "ISENTA" && !ieRaw.includes("ISENTO")) {
      contribuinte = "1";
      ie = ieRaw.replace(/\D/g, ""); // Apenas números para a IE
    } else if (ieRaw === "ISENTO" || ieRaw === "ISENTA") {
      contribuinte = "2";
    } else {
      contribuinte = "9";
    }
  } else {
    // Física
    contribuinte = "9";
  }

  const payload = {
    nome: nameSanitized,
    tipo: documentSanitized.length > 11 ? "J" : "F",
    cnpj: documentSanitized,
    email: client.email || "",
    telefone: phoneSanitized,
    situacao: "A",
    contribuinte: client.icmsContribuinteType || contribuinte,
    inscricaoEstadual: ie || client.stateInscription || "",
    endereco: {
      geral: {
        endereco: logradouro,
        numero: numero,
        bairro: bairro,
        cep: cep,
        municipio: municipio,
        uf: uf
      }
    }
  };

  if (contactId) {
    if (client.syncClientWithErp === false) {
      console.log(`[Bling Sync] Contato existente ID: ${contactId}. Atualização ignorada (checkbox desmarcado).`);
      return contactId;
    }
    
    console.log(`[Bling Sync] Atualizando contato existente ID: ${contactId}`);
    try {
      await requestWithRetry(() => axios.put(`https://api.bling.com.br/Api/v3/contatos/${contactId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }));
      return contactId;
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.warn(`[Bling Sync] Falha ao atualizar dados do contato ID ${contactId}: ${errorMsg}. Prosseguindo com o ID existente.`);
      return contactId; // Fallback to avoid blocking sales order generation
    }
  } else {
    console.log(`[Bling Sync] Criando novo contato: ${client.name}`);
    try {
      const response = await requestWithRetry(() => axios.post("https://api.bling.com.br/Api/v3/contatos", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }));
      const newId = response.data?.data?.id;
      if (!newId) {
        throw new Error("Resposta do Bling não retornou o ID do contato criado.");
      }
      return newId;
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(errorMsg);
    }
  }
}



/**
 * Sincroniza uma peÃ§a (produto) local com o Bling V3.
 * Retorna o ID do produto no Bling.
 */
export async function syncPartToBling(part: {
  name: string;
  code: string;
  price: number;
  ncm?: string | null;
  unit?: string | null;
}, cfopCalculado?: string, cstIcms?: string): Promise<number> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("NÃ£o foi possÃ­vel obter um token vÃ¡lido para o Bling.");
  }

  // 1. Search for existing product by code
  let productId: number | null = null;
  try {
    const searchResponse = await requestWithRetry(() => axios.get(
      "https://api.bling.com.br/Api/v3/produtos",
      {
        params: { codigo: part.code, limite: 1 },
        headers: { Authorization: `Bearer ${token}` }
      }
    ));
    const existing = searchResponse.data?.data || [];
    if (existing.length > 0) {
      productId = existing[0].id;
    }
  } catch (err: any) {
    console.error(`[Bling Sync] Erro ao buscar produto por código ${part.code}:`, err.message);
  }

  const cleanName = (part.name || "Peça Sem Nome").trim().replace(/\s+/g, " ");
  const cleanCode = (part.code || "").trim();
  const cleanNcm = (part.ncm || "").replace(/\D/g, "");

  const payload: any = {
    nome: cleanName,
    codigo: cleanCode,
    preco: part.price > 0 ? part.price : 1.0,
    tipo: "P", // Produto
    formato: "S", // Simples
    situacao: "A",
    unidade: (part.unit || "UN").toUpperCase().trim()
  };

  // No Bling V3 o NCM DEVE ser enviado dentro de `tributacao.ncm`
  const tributacao: any = {};
  if (cleanNcm.length === 8) {
    tributacao.ncm = cleanNcm;
  }
  if (cfopCalculado) {
    tributacao.cfop = cfopCalculado;
  }
  if (cstIcms) {
    tributacao.csosn = cstIcms;
  }
  if (Object.keys(tributacao).length > 0) {
    payload.tributacao = tributacao;
  }

  if (productId) {
    console.log(`[Bling Sync] Atualizando produto existente ID: ${productId} (${cleanCode})`);
    try {
      await requestWithRetry(() => axios.put(`https://api.bling.com.br/Api/v3/produtos/${productId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }));
      return productId;
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(errorMsg);
    }
  } else {
    console.log(`[Bling Sync] Criando novo produto: ${cleanName} (${cleanCode})`);
    try {
      const response = await requestWithRetry(() => axios.post("https://api.bling.com.br/Api/v3/produtos", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }));
      const newId = response.data?.data?.id;
      if (!newId) {
        throw new Error("Resposta do Bling não retornou o ID do produto criado.");
      }
      return newId;
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(errorMsg);
    }
  }
}

/**
 * Busca os detalhes de um contato no Bling V3 pelo ID.
 */
export async function fetchContactFromBling(contactId: number): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error("Não foi possível obter um token válido para o Bling.");

  const response = await requestWithRetry(() => axios.get(
    `https://api.bling.com.br/Api/v3/contatos/${contactId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  ));

  return response.data?.data;
}

/**
 * Busca os detalhes de um produto no Bling V3 pelo ID.
 */
export async function fetchProductFromBling(productId: number): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error("Não foi possível obter um token válido para o Bling.");

  const response = await requestWithRetry(() => axios.get(
    `https://api.bling.com.br/Api/v3/produtos/${productId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  ));

  return response.data?.data;
}

let cachedDepositId: number | null = null;

/**
 * Obtém o ID do depósito de estoque padrão no Bling V3 (com cache em memória).
 */
export async function getBlingDepositId(): Promise<number> {
  if (cachedDepositId) return cachedDepositId;
  const token = await getAccessToken();
  if (!token) throw new Error("Não foi possível obter um token válido para o Bling.");

  try {
    const res = await requestWithRetry(() => axios.get("https://api.bling.com.br/Api/v3/depositos", {
      headers: { Authorization: `Bearer ${token}` }
    }));
    const depositos = res.data?.data || [];
    const defaultDep = depositos.find((d: any) => d.padrao) || depositos[0];
    if (defaultDep?.id) {
      cachedDepositId = defaultDep.id;
      return defaultDep.id;
    }
  } catch (err: any) {
    console.warn("[Bling Sync] Erro ao buscar depósitos no Bling, utilizando ID padrão:", err.message);
  }

  // Fallback para o ID de depósito padrão detectado na conta
  return 14886602802;
}

/**
 * Atualiza o estoque de um produto no Bling V3 usando a operação de Balanço (B).
 */
export async function updateBlingStock(productId: number, stockQty: number, price: number): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Não foi possível obter um token válido para o Bling.");
  }

  const depositId = await getBlingDepositId();

  const payload = {
    produto: { id: productId },
    deposito: { id: depositId },
    operacao: "B", // Balanço: substitui o estoque atual no Bling pelo saldo exato
    quantidade: stockQty,
    preco: price > 0 ? price : 1.0,
    observacoes: "Atualizado via Sincronizador de Estoque MGV"
  };

  try {
    await requestWithRetry(() => axios.post("https://api.bling.com.br/Api/v3/estoques", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }));
  } catch (err: any) {
    const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Erro ao atualizar estoque do produto ID ${productId} no Bling: ${errorMsg}`);
  }
}

/**
 * Busca todos os produtos cadastrados no Bling V3 com paginação automática.
 */
export async function fetchAllBlingProducts(): Promise<any[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Não foi possível obter um token válido para o Bling.");

  const allProducts: any[] = [];
  let page = 1;
  const limit = 100;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  while (true) {
    try {
      const response = await requestWithRetry(() => axios.get(
        "https://api.bling.com.br/Api/v3/produtos",
        {
          params: { pagina: page, limite: limit },
          headers: { Authorization: `Bearer ${token}` }
        }
      ));

      const items = response.data?.data || [];
      if (items.length === 0) break;

      allProducts.push(...items);

      if (items.length < limit) break; // Chegou na última página
      page++;
      await sleep(250); // Throttle para evitar rate limit 429
    } catch (err: any) {
      if (err.response?.status === 404) break; // Sem mais páginas
      console.error(`[Bling Products Scan] Erro na página ${page}:`, err.message);
      break;
    }
  }

  return allProducts;
}

/**
 * Busca todos os saldos de estoque no Bling V3 com paginação automática.
 */
/**
 * Busca os saldos de estoque no Bling V3 para uma lista de IDs de produtos em lotes de 50.
 */
export async function fetchAllBlingStockBalances(productIds?: number[]): Promise<any[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Não foi possível obter um token válido para o Bling.");

  if (!productIds || productIds.length === 0) {
    return [];
  }

  const allBalances: any[] = [];
  const chunkSize = 50;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const queryString = chunk.map(id => `idsProdutos[]=${id}`).join("&");

    try {
      const response = await requestWithRetry(() => axios.get(
        `https://api.bling.com.br/Api/v3/estoques/saldos?${queryString}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ));

      const items = response.data?.data || [];
      allBalances.push(...items);
    } catch (err: any) {
      console.error(`[Bling Stock Balances] Erro no lote ${Math.floor(i / chunkSize) + 1}:`, err.message);
    }

    await sleep(200); // Throttle para respeitar o rate limit
  }

  return allBalances;
}

export interface StockDivergenceItem {
  id: string; // SKU or internal ID
  partId?: string;
  blingId?: number;
  code: string;
  name: string;
  stockLocal: number;
  stockMgv?: number; // Alias para compatibilidade
  stockBling: number;
  stockDelta: number; // stockLocal - stockBling
  ncmLocal: string;
  ncmMgv?: string; // Alias para compatibilidade
  ncmBling: string;
  priceLocal: number;
  priceMgv?: number; // Alias para compatibilidade
  priceBling: number;
  unitLocal: string;
  unitMgv?: string; // Alias para compatibilidade
  unitBling: string;
  status: "OK" | "QTY_DIVERGENCE" | "FISCAL_DIVERGENCE" | "ONLY_LOCAL" | "ONLY_MGV" | "ONLY_BLING" | "SERVICE_OR_LEGACY";
  divergences: string[];
}

export interface StockAuditReport {
  timestamp: string;
  totalItems: number;
  synchronizedCount: number;
  qtyDivergenceCount: number;
  fiscalDivergenceCount: number;
  onlyLocalCount: number;
  onlyMgvCount?: number; // Alias para compatibilidade
  onlyBlingCount: number;
  serviceOrLegacyCount: number;
  totalValueLocal: number;
  totalValueMgv?: number; // Alias para compatibilidade
  totalValueBling: number;
  financialDifference: number;
  items: StockDivergenceItem[];
}

function normalizeSku(sku: string): string {
  return (sku || "").trim().toUpperCase().replace(/^0+/, "");
}

function normalizeName(name: string): string {
  return (name || "").trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Executa a varredura completa cruzando a base de dados do OS Flow com produtos e estoques do Bling.
 */
export async function auditStockAndFiscalDivergences(): Promise<StockAuditReport> {
  // 1. Obter peças ativas do OS Flow
  const localParts = await prisma.part.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" }
  });

  // 2. Obter produtos do Bling
  const blingProducts = await fetchAllBlingProducts();
  const productIds = blingProducts.map(p => p.id).filter(Boolean);

  // 3. Obter saldos de estoque correspondentes aos produtos do Bling
  const blingBalances = await fetchAllBlingStockBalances(productIds);


  // Mapa de saldos por ID de produto do Bling
  const balanceMap = new Map<number, { saldoFisico: number; saldoVirtual: number }>();
  for (const b of blingBalances) {
    if (b.produto?.id) {
      balanceMap.set(b.produto.id, {
        saldoFisico: b.saldoFisicoTotal ?? 0,
        saldoVirtual: b.saldoVirtualTotal ?? 0
      });
    }
  }

  // Mapa de produtos do Bling por Código normalizado
  const blingByCode = new Map<string, any>();
  const blingByName = new Map<string, any>();

  for (const bp of blingProducts) {
    const code = normalizeSku(bp.codigo || "");
    const name = normalizeName(bp.nome || "");
    if (code) blingByCode.set(code, bp);
    if (name) blingByName.set(name, bp);
  }

  const items: StockDivergenceItem[] = [];
  const processedBlingIds = new Set<number>();

  let totalValueLocal = 0;
  let totalValueBling = 0;
  let synchronizedCount = 0;
  let qtyDivergenceCount = 0;
  let fiscalDivergenceCount = 0;
  let onlyLocalCount = 0;
  let onlyBlingCount = 0;
  let serviceOrLegacyCount = 0;

  // 3. Processa todas as peças do OS Flow
  for (const part of localParts) {
    const codeClean = normalizeSku(part.code || "");
    const nameClean = normalizeName(part.name || "");

    const matchedBling = (codeClean && blingByCode.get(codeClean)) || blingByName.get(nameClean);

    const stockLocal = Number(part.stock || 0);
    const priceLocal = Number(part.price || 0);
    const ncmLocal = (part.ncm || "").replace(/\D/g, "");
    const unitLocal = (part.unit || "UN").toUpperCase();

    totalValueLocal += stockLocal * priceLocal;

    if (matchedBling) {
      processedBlingIds.add(matchedBling.id);

      const blingStockData = balanceMap.get(matchedBling.id);
      const stockBling = Number(blingStockData?.saldoFisico ?? matchedBling.estoque?.saldoFisicoTotal ?? 0);
      const priceBling = Number(matchedBling.preco || 0);
      const ncmBling = (matchedBling.ncm || matchedBling.tributacao?.ncm || "").replace(/\D/g, "");
      const unitBling = (matchedBling.unidade || "UN").toUpperCase();

      totalValueBling += stockBling * priceBling;

      const stockDelta = stockLocal - stockBling;
      const divergences: string[] = [];

      // Checagem de Divergência de Quantidade
      const hasQtyDiff = stockLocal !== stockBling;
      if (hasQtyDiff) {
        divergences.push(`Estoque divergente: OS Flow (${stockLocal}) vs Bling (${stockBling}) [Dif: ${stockDelta > 0 ? `+${stockDelta}` : stockDelta}]`);
      }

      // Checagem de Divergência de NCM
      const hasNcmDiff = ncmLocal !== ncmBling;
      if (hasNcmDiff) {
        divergences.push(`NCM divergente: OS Flow (${ncmLocal || "Não preenchido"}) vs Bling (${ncmBling || "Não preenchido"})`);
      }

      // Checagem de Divergência de Preço (tolerância de R$ 0.01 para arredondamentos)
      const hasPriceDiff = Math.abs(priceLocal - priceBling) > 0.01;
      if (hasPriceDiff) {
        divergences.push(`Preço divergente: OS Flow (R$ ${priceLocal.toFixed(2)}) vs Bling (R$ ${priceBling.toFixed(2)})`);
      }

      // Checagem de Unidade
      if (unitLocal !== unitBling) {
        divergences.push(`Unidade divergente: OS Flow (${unitLocal}) vs Bling (${unitBling})`);
      }

      let itemStatus: StockDivergenceItem["status"] = "OK";
      if (hasQtyDiff) {
        itemStatus = "QTY_DIVERGENCE";
        qtyDivergenceCount++;
      } else if (hasNcmDiff || hasPriceDiff) {
        itemStatus = "FISCAL_DIVERGENCE";
        fiscalDivergenceCount++;
      } else {
        itemStatus = "OK";
        synchronizedCount++;
      }

      items.push({
        id: part.id,
        partId: part.id,
        blingId: matchedBling.id,
        code: part.code || matchedBling.codigo || "S/C",
        name: part.name,
        stockLocal,
        stockMgv: stockLocal,
        stockBling,
        stockDelta,
        ncmLocal,
        ncmMgv: ncmLocal,
        ncmBling,
        priceLocal,
        priceMgv: priceLocal,
        priceBling,
        unitLocal,
        unitMgv: unitLocal,
        unitBling,
        status: itemStatus,
        divergences
      });

    } else {
      // Produto existe apenas no OS Flow
      onlyLocalCount++;
      items.push({
        id: part.id,
        partId: part.id,
        code: part.code || "S/C",
        name: part.name,
        stockLocal,
        stockMgv: stockLocal,
        stockBling: 0,
        stockDelta: stockLocal,
        ncmLocal,
        ncmMgv: ncmLocal,
        ncmBling: "",
        priceLocal,
        priceMgv: priceLocal,
        priceBling: 0,
        unitLocal,
        unitMgv: unitLocal,
        unitBling: "",
        status: "ONLY_LOCAL",
        divergences: ["Produto cadastrado no OS Flow, mas não localizado no Bling."]
      });
    }
  }

  // 4. Processa produtos que existem APENAS no Bling
  for (const bp of blingProducts) {
    if (!processedBlingIds.has(bp.id) && bp.tipo === "P" && bp.situacao === "A") {
      const code = (bp.codigo || "").trim().toUpperCase();
      const isServiceOrLegacy = 
        code.startsWith("SRV-") || 
        code.startsWith("AVULSO-") || 
        code.startsWith("BLING-") ||
        code === "SRV-MAO-DE-OBRA" || 
        code === "SRV-SERVICO" || 
        code === "AVULSO-PECA" || 
        code === "AVULSO-SERVICO";

      const blingStockData = balanceMap.get(bp.id);
      const stockBling = Number(blingStockData?.saldoFisico ?? 0);
      const priceBling = Number(bp.preco || 0);
      const ncmBling = (bp.ncm || "").replace(/\D/g, "");
      const unitBling = (bp.unidade || "UN").toUpperCase();

      totalValueBling += stockBling * priceBling;

      if (isServiceOrLegacy) {
        serviceOrLegacyCount++;
      } else {
        onlyBlingCount++;
      }

      items.push({
        id: `bling-${bp.id}`,
        blingId: bp.id,
        code: bp.codigo || `BLING-${bp.id}`,
        name: bp.nome,
        stockLocal: 0,
        stockMgv: 0,
        stockBling,
        stockDelta: -stockBling,
        ncmLocal: "",
        ncmMgv: "",
        ncmBling,
        priceLocal: 0,
        priceMgv: 0,
        priceBling,
        unitLocal: "",
        unitMgv: "",
        unitBling,
        status: isServiceOrLegacy ? "SERVICE_OR_LEGACY" : "ONLY_BLING",
        divergences: [
          isServiceOrLegacy
            ? "Item de serviço ou código temporário do Bling."
            : "Produto cadastrado no Bling, mas não localizado no OS Flow."
        ]
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalItems: items.length,
    synchronizedCount,
    qtyDivergenceCount,
    fiscalDivergenceCount,
    onlyLocalCount,
    onlyMgvCount: onlyLocalCount,
    onlyBlingCount,
    serviceOrLegacyCount,
    totalValueLocal: parseFloat(totalValueLocal.toFixed(2)),
    totalValueMgv: parseFloat(totalValueLocal.toFixed(2)),
    totalValueBling: parseFloat(totalValueBling.toFixed(2)),
    financialDifference: parseFloat((totalValueLocal - totalValueBling).toFixed(2)),
    items
  };
}

/**
 * Sincroniza dados cadastrais, NCM e saldo de estoque de uma peça específica do MGV para o Bling.
 */
export async function syncSinglePartToBling(partId: string): Promise<{ success: boolean; blingId: number; message: string }> {
  const part = await prisma.part.findUnique({
    where: { id: partId }
  });

  if (!part) {
    throw new Error("Peça não encontrada no banco de dados.");
  }

  const validPrice = part.price > 0 ? part.price : (part.cost > 0 ? part.cost * 1.5 : 1.0);
  const codeClean = part.code ? part.code.trim() : `SKU-${part.id.substring(0, 8)}`;
  const nameClean = part.name ? part.name.trim() : "Peça Sem Nome";

  // 1. Sincroniza dados do produto (Nome, Código, Preço, NCM, Unidade)
  const blingProductId = await syncPartToBling({
    code: codeClean,
    name: nameClean,
    price: validPrice,
    ncm: part.ncm || undefined,
    unit: part.unit || "UN"
  }, part.cfopIntraEstadual || undefined, part.cstIcms || undefined);

  // 2. Atualiza o saldo no Bling
  await updateBlingStock(blingProductId, part.stock, validPrice);

  return {
    success: true,
    blingId: blingProductId,
    message: `Peça ${codeClean} sincronizada no Bling com sucesso (Estoque: ${part.stock}, NCM: ${part.ncm || "N/A"}).`
  };
}

/**
 * Atualiza o cadastro local do MGV com os dados vindos do Bling (Estoque, NCM, Preço).
 */
export async function syncSinglePartFromBling(partId: string, blingData: {
  stockBling: number;
  ncmBling?: string;
  priceBling?: number;
  unitBling?: string;
}): Promise<{ success: boolean; message: string }> {
  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) throw new Error("Peça não encontrada no MGV.");

  const updateData: any = {
    stock: blingData.stockBling
  };

  if (blingData.ncmBling && blingData.ncmBling.length === 8) {
    updateData.ncm = blingData.ncmBling;
  }
  if (blingData.priceBling && blingData.priceBling > 0) {
    updateData.price = blingData.priceBling;
  }
  if (blingData.unitBling) {
    updateData.unit = blingData.unitBling;
  }

  await prisma.part.update({
    where: { id: partId },
    data: updateData
  });

  return {
    success: true,
    message: `Peça ${part.code} atualizada no MGV com dados do Bling (Estoque: ${blingData.stockBling}, NCM: ${updateData.ncm || part.ncm}).`
  };
}

// ─── WORKER DE SINCRONIZAÇÃO EM SEGUNDO PLANO COM MONITORAMENTO REALTIME ───

export interface StockSyncWorkerState {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "stopped" | "error";
  startTime: string | null;
  endTime: string | null;
  total: number;
  processed: number;
  successCount: number;
  errorCount: number;
  percentage: number;
  currentItem: string | null;
  itemsPerMinute: number;
  estimatedRemainingSeconds: number;
  logs: { timestamp: string; message: string; type: "info" | "success" | "error" }[];
  lastError: string | null;
}

let syncWorkerState: StockSyncWorkerState = {
  isRunning: false,
  status: "idle",
  startTime: null,
  endTime: null,
  total: 0,
  processed: 0,
  successCount: 0,
  errorCount: 0,
  percentage: 0,
  currentItem: null,
  itemsPerMinute: 0,
  estimatedRemainingSeconds: 0,
  logs: [],
  lastError: null
};

let cancelRequested = false;

function addWorkerLog(message: string, type: "info" | "success" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  syncWorkerState.logs.unshift({ timestamp, message, type });
  if (syncWorkerState.logs.length > 200) {
    syncWorkerState.logs.pop();
  }
}

export function getStockSyncWorkerStatus(): StockSyncWorkerState {
  if (syncWorkerState.isRunning && syncWorkerState.startTime && syncWorkerState.processed > 0) {
    const elapsedMinutes = (Date.now() - new Date(syncWorkerState.startTime).getTime()) / 60000;
    const rate = elapsedMinutes > 0 ? syncWorkerState.processed / elapsedMinutes : 0;
    syncWorkerState.itemsPerMinute = parseFloat(rate.toFixed(1));
    const remaining = syncWorkerState.total - syncWorkerState.processed;
    syncWorkerState.estimatedRemainingSeconds = rate > 0 ? Math.round((remaining / rate) * 60) : 0;
  }
  return { ...syncWorkerState };
}

export function stopStockSyncWorker(): { stopped: boolean; message: string } {
  if (!syncWorkerState.isRunning) {
    return { stopped: false, message: "Nenhuma sincronização em execução no momento." };
  }
  cancelRequested = true;
  addWorkerLog("⏹️ Solicitação de cancelamento recebida pelo usuário.", "info");
  return { stopped: true, message: "Interrupção solicitada com sucesso." };
}

export async function startStockSyncWorker(options: { divergentOnly?: boolean } = { divergentOnly: true }): Promise<{ started: boolean; message: string }> {
  if (syncWorkerState.isRunning) {
    return { started: false, message: "Uma sincronização já está em andamento no momento." };
  }

  cancelRequested = false;
  syncWorkerState = {
    isRunning: true,
    status: "running",
    startTime: new Date().toISOString(),
    endTime: null,
    total: 0,
    processed: 0,
    successCount: 0,
    errorCount: 0,
    percentage: 0,
    currentItem: "Gerando relatório de auditoria e divergências...",
    itemsPerMinute: 0,
    estimatedRemainingSeconds: 0,
    logs: [],
    lastError: null
  };

  addWorkerLog("🚀 Iniciando Worker de Sincronização em Segundo Plano...", "info");

  // Inicia a execução assíncrona desacoplada
  (async () => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      addWorkerLog("📊 Auditando catálogo e estoque com a API do Bling V3...", "info");
      const report = await auditStockAndFiscalDivergences();

      // Filtra itens que precisam de sincronização (divergências ou novos)
      let targetItems = report.items;
      if (options.divergentOnly !== false) {
        targetItems = report.items.filter(i => 
          i.partId && (i.status === "QTY_DIVERGENCE" || i.status === "FISCAL_DIVERGENCE" || i.status === "ONLY_MGV")
        );
      } else {
        targetItems = report.items.filter(i => !!i.partId);
      }

      syncWorkerState.total = targetItems.length;

      if (targetItems.length === 0) {
        syncWorkerState.isRunning = false;
        syncWorkerState.status = "completed";
        syncWorkerState.endTime = new Date().toISOString();
        syncWorkerState.percentage = 100;
        syncWorkerState.currentItem = null;
        addWorkerLog("✅ Nenhuma divergência pendente! O estoque e NCMs já estão 100% sincronizados.", "success");
        return;
      }

      addWorkerLog(`📦 Total de itens para sincronizar no Bling: ${targetItems.length}`, "info");

      for (const item of targetItems) {
        if (cancelRequested) {
          syncWorkerState.status = "stopped";
          addWorkerLog("⏹️ Sincronização interrompida pelo usuário.", "info");
          break;
        }

        if (!item.partId) {
          syncWorkerState.processed++;
          continue;
        }

        syncWorkerState.currentItem = `${item.code} - ${item.name.substring(0, 30)}`;

        try {
          const syncResult = await syncSinglePartToBling(item.partId);
          syncWorkerState.successCount++;
          addWorkerLog(`✓ SKU: ${item.code} | Estoque: ${item.stockMgv} | NCM: ${item.ncmMgv || "N/A"}`, "success");
        } catch (err: any) {
          syncWorkerState.errorCount++;
          addWorkerLog(`❌ SKU: ${item.code} - Falha: ${err.message}`, "error");
        } finally {
          syncWorkerState.processed++;
          syncWorkerState.percentage = Math.round((syncWorkerState.processed / syncWorkerState.total) * 100);
        }

        // Throttle de 500ms para respeitar a taxa de requisições por segundo (Rate Limit) do Bling
        await sleep(500);
      }

      if (!cancelRequested) {
        syncWorkerState.status = "completed";
        addWorkerLog(`🎉 Sincronização concluída com sucesso! Sucessos: ${syncWorkerState.successCount} | Falhas: ${syncWorkerState.errorCount}`, "success");
      }
    } catch (fatalError: any) {
      console.error("[Stock Sync Background Worker Fatal]", fatalError);
      syncWorkerState.status = "error";
      syncWorkerState.lastError = fatalError.message;
      addWorkerLog(`💥 Erro fatal no worker: ${fatalError.message}`, "error");
    } finally {
      syncWorkerState.isRunning = false;
      syncWorkerState.endTime = new Date().toISOString();
      syncWorkerState.currentItem = null;
    }
  })().catch(e => {
    console.error("[Stock Sync Unhandled]", e);
  });

  return {
    started: true,
    message: "Sincronizador em segundo plano iniciado com sucesso."
  };
}




