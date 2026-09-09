import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { AsaasClient } from "../../src/services/asaas.client";

describe("AsaasClient - Motor Financeiro e Cobrança", () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.ASAAS_API_KEY = "mock_api_key_123";
    process.env.ASAAS_ENVIRONMENT = "sandbox";

    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn()
    };
    vi.spyOn(axios, "create").mockReturnValue(mockAxiosInstance);
  });

  it("deve criar ou localizar um cliente no Asaas corretamente", async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        id: "cus_000005847481",
        name: "Oficina do Silva",
        email: "silva@oficina.com",
        cpfCnpj: "12345678000195"
      }
    });

    const client = new AsaasClient();
    const customer = await client.findOrCreateCustomer({
      name: "Oficina do Silva",
      email: "silva@oficina.com",
      cpfCnpj: "12345678000195",
      mobilePhone: "11999998888"
    });

    expect(customer.id).toBe("cus_000005847481");
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      "/customers",
      expect.objectContaining({
        name: "Oficina do Silva",
        cpfCnpj: "12345678000195"
      })
    );
  });

  it("deve criar uma assinatura recorrente com parâmetros corretos", async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        id: "sub_99887766",
        customer: "cus_000005847481",
        billingType: "PIX",
        value: 149.00,
        status: "ACTIVE"
      }
    });

    const client = new AsaasClient();
    const subscription = await client.createSubscription({
      customerId: "cus_000005847481",
      billingType: "PIX",
      value: 149.00,
      nextDueDate: "2026-09-15",
      cycle: "MONTHLY",
      description: "Plano Pro OS-Flow SaaS"
    });

    expect(subscription.id).toBe("sub_99887766");
    expect(subscription.status).toBe("ACTIVE");
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      "/subscriptions",
      expect.objectContaining({
        customer: "cus_000005847481",
        billingType: "PIX",
        value: 149.00
      })
    );
  });

  it("deve buscar o QR code PIX de uma cobrança", async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        encodedImage: "data:image/png;base64,mockQrCodeBase64",
        payload: "00020101021226...mockPixPayload",
        expirationDate: "2026-10-01"
      }
    });

    const client = new AsaasClient();
    const qrData = await client.getPixQrCode("pay_112233");

    expect(qrData.payload).toBe("00020101021226...mockPixPayload");
    expect(qrData.encodedImage).toContain("data:image/png;base64");
    expect(mockAxiosInstance.get).toHaveBeenCalledWith("/payments/pay_112233/pixQrCode");
  });
});
