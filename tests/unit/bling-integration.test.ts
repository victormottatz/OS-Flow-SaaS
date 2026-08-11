import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccessToken, syncPartToBling } from "../../src/services/bling";
import prisma from "../../src/database/prisma";
import axios from "axios";

describe("Bling Integration Service - Mutex & Token Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve retornar null se as credenciais do ambiente não estiverem configuradas", async () => {
    const originalClientId = process.env.BLING_CLIENT_ID;
    delete process.env.BLING_CLIENT_ID;

    const token = await getAccessToken();
    expect(token).toBeNull();

    process.env.BLING_CLIENT_ID = originalClientId;
  });

  it("deve retornar o accessToken do banco se o token ainda for válido", async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hora no futuro
    vi.spyOn(prisma.blingConfig, "findUnique").mockResolvedValue({
      id: 1,
      accessToken: "mock_valid_access_token_123",
      refreshToken: "mock_refresh_token_456",
      expiresAt: futureDate,
      updatedAt: new Date()
    } as any);

    process.env.BLING_CLIENT_ID = "mock_client_id";
    process.env.BLING_CLIENT_SECRET = "mock_client_secret";

    const token = await getAccessToken();
    expect(token).toBe("mock_valid_access_token_123");
  });

  it("deve incluir o NCM limpo no payload de tributação ao sincronizar uma peça", async () => {
    vi.spyOn(prisma.blingConfig, "findUnique").mockResolvedValue({
      id: 1,
      accessToken: "mock_token",
      refreshToken: "mock_refresh",
      expiresAt: new Date(Date.now() + 3600 * 1000)
    } as any);

    // Mock do axios para buscar produto e depois cadastrar
    const mockGet = vi.spyOn(axios, "get").mockResolvedValue({ data: { data: [] } } as any);
    const mockPost = vi.spyOn(axios, "post").mockResolvedValue({ data: { data: { id: 9999 } } } as any);

    const result = await syncPartToBling({
      name: "Peça de Teste",
      code: "TEST-NCM",
      price: 150.0,
      ncm: "8536.50.90"
    });

    expect(result).toBe(9999);
    expect(mockPost).toHaveBeenCalled();
    const payload = mockPost.mock.calls[0][1] as any;
    expect(payload.ncm).toBe("85365090"); // Pontos removidos
  });
});
