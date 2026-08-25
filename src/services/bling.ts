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

    // Save tokens in database (upsert id 1)
    await prisma.blingConfig.upsert({
      where: { id: 1 },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
      create: {
        id: 1,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
    });

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
export async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Bling OAuth] BLING_CLIENT_ID ou BLING_CLIENT_SECRET não configurados no ambiente.");
    return null;
  }

  // 1. Fetch current config from Supabase
  const config = await prisma.blingConfig.findUnique({
    where: { id: 1 },
  });

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
        where: { id: 1 },
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
    console.error(`[Bling Sync] Erro ao buscar produto por cÃ³digo ${part.code}:`, err.message);
  }

  const payload: BlingProductPayload = {
    nome: part.name,
    codigo: part.code,
    preco: part.price,
    tipo: "P", // Produto
    formato: "S", // Simples
    situacao: "A"
  };

  // NCM: envia apenas se for um código válido de 8 dígitos (normalizado) — um NCM
  // inválido/vazio seria rejeitado pelo Bling e derrubaria a sincronização inteira.
  const cleanNcm = (part.ncm || "").replace(/\D/g, "");
  if (cleanNcm.length === 8) {
    payload.ncm = cleanNcm;
  }
  if (part.unit) {
    payload.unidade = part.unit;
  }

  if (cfopCalculado || cstIcms) {
    payload.tributacao = {
      cfop: cfopCalculado,
      csosn: cstIcms
    };
  }

  if (productId) {
    console.log(`[Bling Sync] Atualizando produto existente ID: ${productId}`);
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
    console.log(`[Bling Sync] Criando novo produto: ${part.name}`);
    try {
      const response = await requestWithRetry(() => axios.post("https://api.bling.com.br/Api/v3/produtos", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }));
      const newId = response.data?.data?.id;
      if (!newId) {
        throw new Error("Resposta do Bling nÃ£o retornou o ID do produto criado.");
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
export async function fetchAllBlingStockBalances(): Promise<any[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Não foi possível obter um token válido para o Bling.");

  const allBalances: any[] = [];
  let page = 1;
  const limit = 100;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  while (true) {
    try {
      const response = await requestWithRetry(() => axios.get(
        "https://api.bling.com.br/Api/v3/estoques/saldos",
        {
          params: { pagina: page, limite: limit },
          headers: { Authorization: `Bearer ${token}` }
        }
      ));

      const items = response.data?.data || [];
      if (items.length === 0) break;

      allBalances.push(...items);

      if (items.length < limit) break;
      page++;
      await sleep(250);
    } catch (err: any) {
      if (err.response?.status === 404) break;
      console.error(`[Bling Stock Balances] Erro na página ${page}:`, err.message);
      break;
    }
  }

  return allBalances;
}

export interface StockDivergenceItem {
  id: string; // SKU or internal ID
  partId?: string;
  blingId?: number;
  code: string;
  name: string;
  stockMgv: number;
  stockBling: number;
  stockDelta: number; // stockMgv - stockBling
  ncmMgv: string;
  ncmBling: string;
  priceMgv: number;
  priceBling: number;
  unitMgv: string;
  unitBling: string;
  status: "OK" | "QTY_DIVERGENCE" | "FISCAL_DIVERGENCE" | "ONLY_MGV" | "ONLY_BLING";
  divergences: string[];
}

export interface StockAuditReport {
  timestamp: string;
  totalItems: number;
  synchronizedCount: number;
  qtyDivergenceCount: number;
  fiscalDivergenceCount: number;
  onlyMgvCount: number;
  onlyBlingCount: number;
  totalValueMgv: number;
  totalValueBling: number;
  financialDifference: number;
  items: StockDivergenceItem[];
}

/**
 * Executa a varredura completa cruzando a base de dados do MGV com produtos e estoques do Bling.
 */
export async function auditStockAndFiscalDivergences(): Promise<StockAuditReport> {
  // 1. Obter peças ativas do MGV
  const mgvParts = await prisma.part.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" }
  });

  // 2. Obter produtos e saldos do Bling em paralelo
  const [blingProducts, blingBalances] = await Promise.all([
    fetchAllBlingProducts(),
    fetchAllBlingStockBalances()
  ]);

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
    const code = (bp.codigo || "").trim().toUpperCase();
    const name = (bp.nome || "").trim().toUpperCase();
    if (code) blingByCode.set(code, bp);
    if (name) blingByName.set(name, bp);
  }

  const items: StockDivergenceItem[] = [];
  const processedBlingIds = new Set<number>();

  let totalValueMgv = 0;
  let totalValueBling = 0;
  let synchronizedCount = 0;
  let qtyDivergenceCount = 0;
  let fiscalDivergenceCount = 0;
  let onlyMgvCount = 0;
  let onlyBlingCount = 0;

  // 3. Processa todas as peças do MGV
  for (const part of mgvParts) {
    const codeClean = (part.code || "").trim().toUpperCase();
    const nameClean = (part.name || "").trim().toUpperCase();

    const matchedBling = (codeClean && blingByCode.get(codeClean)) || blingByName.get(nameClean);

    const stockMgv = Number(part.stock || 0);
    const priceMgv = Number(part.price || 0);
    const ncmMgv = (part.ncm || "").replace(/\D/g, "");
    const unitMgv = (part.unit || "UN").toUpperCase();

    totalValueMgv += stockMgv * priceMgv;

    if (matchedBling) {
      processedBlingIds.add(matchedBling.id);

      const blingStockData = balanceMap.get(matchedBling.id);
      const stockBling = Number(blingStockData?.saldoFisico ?? matchedBling.estoque?.saldoFisicoTotal ?? 0);
      const priceBling = Number(matchedBling.preco || 0);
      const ncmBling = (matchedBling.ncm || matchedBling.tributacao?.ncm || "").replace(/\D/g, "");
      const unitBling = (matchedBling.unidade || "UN").toUpperCase();

      totalValueBling += stockBling * priceBling;

      const stockDelta = stockMgv - stockBling;
      const divergences: string[] = [];

      // Checagem de Divergência de Quantidade
      const hasQtyDiff = stockMgv !== stockBling;
      if (hasQtyDiff) {
        divergences.push(`Estoque divergente: MGV (${stockMgv}) vs Bling (${stockBling}) [Dif: ${stockDelta > 0 ? `+${stockDelta}` : stockDelta}]`);
      }

      // Checagem de Divergência de NCM
      const hasNcmDiff = ncmMgv !== ncmBling;
      if (hasNcmDiff) {
        divergences.push(`NCM divergente: MGV (${ncmMgv || "Não preenchido"}) vs Bling (${ncmBling || "Não preenchido"})`);
      }

      // Checagem de Divergência de Preço (tolerância de R$ 0.01 para arredondamentos)
      const hasPriceDiff = Math.abs(priceMgv - priceBling) > 0.01;
      if (hasPriceDiff) {
        divergences.push(`Preço divergente: MGV (R$ ${priceMgv.toFixed(2)}) vs Bling (R$ ${priceBling.toFixed(2)})`);
      }

      // Checagem de Unidade
      if (unitMgv !== unitBling) {
        divergences.push(`Unidade divergente: MGV (${unitMgv}) vs Bling (${unitBling})`);
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
        stockMgv,
        stockBling,
        stockDelta,
        ncmMgv,
        ncmBling,
        priceMgv,
        priceBling,
        unitMgv,
        unitBling,
        status: itemStatus,
        divergences
      });

    } else {
      // Produto existe apenas no MGV
      onlyMgvCount++;
      items.push({
        id: part.id,
        partId: part.id,
        code: part.code || "S/C",
        name: part.name,
        stockMgv,
        stockBling: 0,
        stockDelta: stockMgv,
        ncmMgv,
        ncmBling: "",
        priceMgv,
        priceBling: 0,
        unitMgv,
        unitBling: "",
        status: "ONLY_MGV",
        divergences: ["Produto cadastrado no MGV, mas não localizado no Bling."]
      });
    }
  }

  // 4. Processa produtos que existem APENAS no Bling
  for (const bp of blingProducts) {
    if (!processedBlingIds.has(bp.id) && bp.tipo === "P" && bp.situacao === "A") {
      onlyBlingCount++;
      const blingStockData = balanceMap.get(bp.id);
      const stockBling = Number(blingStockData?.saldoFisico ?? 0);
      const priceBling = Number(bp.preco || 0);
      const ncmBling = (bp.ncm || "").replace(/\D/g, "");
      const unitBling = (bp.unidade || "UN").toUpperCase();

      totalValueBling += stockBling * priceBling;

      items.push({
        id: `bling-${bp.id}`,
        blingId: bp.id,
        code: bp.codigo || `BLING-${bp.id}`,
        name: bp.nome,
        stockMgv: 0,
        stockBling,
        stockDelta: -stockBling,
        ncmMgv: "",
        ncmBling,
        priceMgv: 0,
        priceBling,
        unitMgv: "",
        unitBling,
        status: "ONLY_BLING",
        divergences: ["Produto cadastrado no Bling, mas não localizado no MGV."]
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalItems: items.length,
    synchronizedCount,
    qtyDivergenceCount,
    fiscalDivergenceCount,
    onlyMgvCount,
    onlyBlingCount,
    totalValueMgv: parseFloat(totalValueMgv.toFixed(2)),
    totalValueBling: parseFloat(totalValueBling.toFixed(2)),
    financialDifference: parseFloat((totalValueMgv - totalValueBling).toFixed(2)),
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




