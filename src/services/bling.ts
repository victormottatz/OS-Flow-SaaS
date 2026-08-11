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
          params: { cnpj: documentSanitized, limite: 1 },
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
  let cep = "14000000"; // Fallback para Ribeirão Preto genérico
  let municipio = "Ribeirão Preto";
  let uf = "SP";

  const rawAddress = client.address || "";

  try {
    // 1. Extrair CEP (formato XXXXX-XXX ou XXXXXXXX)
    const cepMatch = rawAddress.match(/\b\d{5}-?\d{3}\b/);
    if (cepMatch) {
      cep = cepMatch[0].replace(/\D/g, "");
    }

    // 2. Extrair UF/Estado (ex: "SP", "/SP", "- SP")
    const ufMatch = rawAddress.match(/[\/,\-\s]\s*([A-Za-z]{2})\b/);
    if (ufMatch) {
      const parsedUf = ufMatch[1].toUpperCase();
      // Simples lista de UFs válidas brasileiras
      const validUfs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
      if (validUfs.includes(parsedUf)) {
        uf = parsedUf;
      }
    }

    // 3. Extrair Município
    const cityMatch = rawAddress.match(/([^,\-\/]+)\s*[\/-]\s*([A-Za-z]{2})\b/);
    if (cityMatch) {
      const potentialCity = cityMatch[1].trim();
      if (potentialCity.length > 2 && potentialCity.toUpperCase() !== "BAIRRO") {
        municipio = potentialCity;
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
  // 1 - Contribuinte ICMS (PJ com IE)
  // 2 - Contribuinte isento (PJ sem IE / Isento)
  // 9 - Não Contribuinte (PF ou PJ sem IE)
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
    tipo: documentSanitized.length > 11 ? "Juridica" : "Física",
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


