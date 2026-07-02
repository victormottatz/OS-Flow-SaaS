/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
 * if the cached token is expired or close to expiration.
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
  const now = new Date();
  const bufferTime = new Date(Date.now() + 30000); // 30s buffer

  if (config.expiresAt > bufferTime) {
    // Token is valid, return it
    return config.accessToken;
  }

  // 3. Token is expired or expiring soon, perform refresh
  console.log(`[Bling OAuth] Access token expirado ou prestes a expirar. Iniciando renovação automática...`);
  console.log(`[Bling OAuth] Refresh token atual: ${maskToken(config.refreshToken)}`);

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
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

    // Save renewed tokens back to Supabase
    await prisma.blingConfig.update({
      where: { id: 1 },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || config.refreshToken, // Bling might return a new refresh token or same
        expiresAt: expiresAt,
      },
    });

    console.log(`[Bling OAuth] Token renovado automaticamente com absoluto sucesso. Novo vencimento: ${expiresAt.toISOString()}`);
    return access_token;
  } catch (err: any) {
    const status = err.response?.status;
    const data = err.response?.data;
    const msg = `HTTP ${status || "Desconhecido"}: ${JSON.stringify(data || err.message)}`;
    console.error("[Bling OAuth Error] Erro ao renovar o access token:", msg);
    // Do not throw, return null to let the application handle offline mode gracefully
    return null;
  }
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

  // Parse Address string
  let logradouro = "Não informado";
  let numero = "S/N";
  let bairro = "Centro";
  let cep = "01000000";
  let municipio = "Ribeirão Preto";
  let uf = "SP";

  try {
    // 1. Extract UF and Municipio using regex
    const cityMatch = client.address.match(/([^,\-]+)\/([A-Za-z]{2})/);
    if (cityMatch) {
      municipio = cityMatch[1].trim();
      uf = cityMatch[2].trim().toUpperCase().substring(0, 2);
    }

    // 2. Extract CEP
    const cepMatch = client.address.match(/\b\d{2}\.?\d{3}-?\d{3}\b/);
    if (cepMatch) {
      cep = cepMatch[0].replace(/\D/g, "");
    }

    // 3. Extract Logradouro and Numero
    const commaParts = client.address.split(",");
    if (commaParts.length > 0) {
      logradouro = commaParts[0].trim();
      if (commaParts.length > 1) {
        const potentialNum = commaParts[1].trim().split(" ")[0].replace(/\D/g, "");
        if (potentialNum && potentialNum.length > 0) {
          numero = potentialNum;
        }
      }
    }

    // 4. Extract Bairro
    const bairroMatch = client.address.match(/Bairro\s+([^,\-]+)/i);
    if (bairroMatch) {
      bairro = bairroMatch[1].trim();
    }
  } catch (e) {
    // fallback
  }

  // Sanitization: Remove non-digits from phone (fix double backslash regex escape)
  const phoneSanitized = client.phone.replace(/\D/g, "").substring(0, 11);
  const nameSanitized = client.name.trim().replace(/\s{2,}/g, " ");

  const payload = {
    nome: nameSanitized,
    // Bling V3 expects "Física" or "Juridica" literally as the 'tipo' field
    tipo: documentSanitized.length > 11 ? "Juridica" : "Física",
    cnpj: documentSanitized,
    email: client.email || "",
    telefone: phoneSanitized,
    situacao: "A",
    contribuinte: "9", // Não contribuinte
    endereco: {
      geral: {
        endereco: logradouro || "Não informado",
        numero: numero || "S/N",
        bairro: bairro || "Centro",
        cep: cep.replace(/\D/g, "") || "01000000",
        municipio: municipio || "Nao informado",
        uf: uf || "SP"
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
 * Sincroniza uma peça (produto) local com o Bling V3.
 * Retorna o ID do produto no Bling.
 */
export async function syncPartToBling(part: {
  name: string;
  code: string;
  price: number;
}): Promise<number> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Não foi possível obter um token válido para o Bling.");
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

  const payload = {
    nome: part.name,
    codigo: part.code,
    preco: part.price,
    tipo: "P", // Produto
    formato: "S", // Simples
    situacao: "A"
  };

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
        throw new Error("Resposta do Bling não retornou o ID do produto criado.");
      }
      return newId;
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(errorMsg);
    }
  }
}

