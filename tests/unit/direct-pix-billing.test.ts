import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../../src/database/prisma";
import { BillingService } from "../../src/services/billing.service";

describe("BillingService - Fluxo de PIX Direto e Ativação Manual", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve retornar as configurações de PIX direto oficiais", async () => {
    vi.spyOn(prisma.officeSetting, "findMany").mockResolvedValue([
      { key: "PIX_KEY", value: "contato@mgvtecnologia.com.br" },
      { key: "PIX_NAME", value: "MGV Assistência Especializada" },
      { key: "PIX_BANK", value: "Banco Inter" },
      { key: "SUPPORT_WHATSAPP", value: "5516999998888" }
    ] as any);

    const service = new BillingService();
    const config = await service.getDirectPixConfig();

    expect(config.pixKey).toBe("contato@mgvtecnologia.com.br");
    expect(config.pixName).toBe("MGV Assistência Especializada");
    expect(config.pixBank).toBe("Banco Inter");
    expect(config.pixWhatsapp).toBe("5516999998888");
  });

  it("deve registrar a notificação de PIX direto gerando fatura pendente", async () => {
    vi.spyOn(prisma.plan, "findUnique").mockResolvedValue({
      id: "plan-pro",
      name: "Plano Pro",
      priceMonthly: 149.00,
      priceAnnual: 1490.00
    } as any);

    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      id: "comp-123",
      name: "Oficina do Silva",
      subscription: null
    } as any);

    const subCreateSpy = vi.fn().mockResolvedValue({
      id: "sub-new-123",
      companyId: "comp-123",
      status: "TRIAL"
    });

    const invCreateSpy = vi.fn().mockResolvedValue({
      id: "inv-new-123",
      subscriptionId: "sub-new-123",
      status: "PENDING",
      amount: 149.00
    });

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback({
        subscription: { create: subCreateSpy, update: vi.fn() },
        invoice: { create: invCreateSpy }
      });
    });

    const service = new BillingService();
    const result = await service.notifyDirectPixPayment("comp-123", "plan-pro", "MONTHLY");

    expect(result.subscription).toBeDefined();
    expect(result.invoice).toBeDefined();
    expect(result.invoice.status).toBe("PENDING");
    expect(invCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: "sub-new-123",
          amount: 149.00,
          status: "PENDING"
        })
      })
    );
  });

  it("deve permitir que o Dono ative manualmente uma oficina por 30 dias", async () => {
    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      id: "comp-999",
      name: "Oficina Matriz",
      subscription: { id: "sub-existente", status: "TRIAL" }
    } as any);

    vi.spyOn(prisma.plan, "findUnique").mockResolvedValue({
      id: "plan-pro-id",
      tier: "PRO",
      name: "Plano Pro",
      priceMonthly: 149.00
    } as any);

    const subUpdateSpy = vi.fn().mockResolvedValue({
      id: "sub-existente",
      status: "ACTIVE"
    });

    const invCreateSpy = vi.fn().mockResolvedValue({
      id: "inv-manual-1",
      status: "PAID",
      amount: 149.00
    });

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      return callback({
        subscription: { update: subUpdateSpy, create: vi.fn() },
        invoice: { create: invCreateSpy }
      });
    });

    const service = new BillingService();
    const result = await service.manualActivateSubscription({
      companyId: "comp-999",
      days: 30,
      planTier: "PRO"
    });

    expect(result.success).toBe(true);
    expect(subUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-existente" },
        data: expect.objectContaining({
          status: "ACTIVE",
          trialEndsAt: null
        })
      })
    );
    expect(invCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          amount: 149.00
        })
      })
    );
  });
});
