import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// URL do token OAuth do Bling
const BLING_TOKEN_URL = "https://api.bling.com.br/Api/v3/oauth/token";

function maskToken(token: string): string {
  if (!token) return "empty";
  if (token.length <= 8) return "***";
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

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
      console.warn(`[Bling Rate Limit] Código 429. Aguardando ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return requestWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

async function main() {
  console.log("Iniciando verificação de produtos e NCM no Bling...");
  const token = await getAccessToken();
  if (!token) {
    console.error("Não foi possível obter o token de acesso do Bling.");
    process.exit(1);
  }

  console.log("Conectado ao Bling com sucesso. Buscando detalhes do produto 16686895179...");
  
  try {
    const detailResponse = await axios.get("https://api.bling.com.br/Api/v3/produtos/16686895179", {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Detalhes completos do produto:");
    console.log(JSON.stringify(detailResponse.data?.data, null, 2));

  } catch (err: any) {
    console.error("Erro ao buscar detalhes do produto:", err.response?.data || err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
