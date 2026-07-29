import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccessToken } from "../../src/services/bling";
import prisma from "../../src/database/prisma";

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
});
