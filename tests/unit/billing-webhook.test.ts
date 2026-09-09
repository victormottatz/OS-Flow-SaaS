import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../../src/database/prisma";
import { BillingService } from "../../src/services/billing.service";

describe("BillingService & Asaas Webhook - Gestão de Assinaturas e Idempotência", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve ativar o plano e faturar em evento PAYMENT_RECEIVED", async () => {
    const subSpy = vi.spyOn(prisma.subscription, "updateMany").mockResolvedValue({ count: 1 } as any);
    const invSpy = vi.spyOn(prisma.invoice, "updateMany").mockResolvedValue({ count: 1 } as any);

    const billingService = new BillingService();
    const result = await billingService.handleWebhook("PAYMENT_RECEIVED", {
      payment: {
        id: "pay_12345678",
        subscription: "sub_99887766",
        value: 149.00,
        billingType: "PIX",
        status: "RECEIVED"
      }
    });

    expect(result.received).toBe(true);
    expect(subSpy).toHaveBeenCalledWith({
      where: { asaasSubscriptionId: "sub_99887766" },
      data: { status: "ACTIVE", trialEndsAt: null }
    });
    expect(invSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asaasInvoiceId: "pay_12345678" },
        data: expect.objectContaining({ status: "PAID" })
      })
    );
  });

  it("deve marcar a assinatura como PAST_DUE em evento PAYMENT_OVERDUE", async () => {
    const subSpy = vi.spyOn(prisma.subscription, "updateMany").mockResolvedValue({ count: 1 } as any);
    const invSpy = vi.spyOn(prisma.invoice, "updateMany").mockResolvedValue({ count: 1 } as any);

    const billingService = new BillingService();
    const result = await billingService.handleWebhook("PAYMENT_OVERDUE", {
      payment: {
        id: "pay_vencido_999",
        subscription: "sub_99887766",
        value: 79.00,
        status: "OVERDUE"
      }
    });

    expect(result.received).toBe(true);
    expect(subSpy).toHaveBeenCalledWith({
      where: { asaasSubscriptionId: "sub_99887766" },
      data: { status: "PAST_DUE" }
    });
    expect(invSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asaasInvoiceId: "pay_vencido_999" },
        data: { status: "OVERDUE" }
      })
    );
  });

  it("deve processar cancelamento em SUBSCRIPTION_CANCELED", async () => {
    const subSpy = vi.spyOn(prisma.subscription, "updateMany").mockResolvedValue({ count: 1 } as any);

    const billingService = new BillingService();
    const result = await billingService.handleWebhook("SUBSCRIPTION_CANCELED", {
      subscriptionId: "sub_99887766"
    });

    expect(result.received).toBe(true);
    expect(subSpy).toHaveBeenCalledWith({
      where: { asaasSubscriptionId: "sub_99887766" },
      data: { status: "CANCELED" }
    });
  });
});
