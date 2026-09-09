import prisma from "../database/prisma";
import { SubscriptionStatus, BillingCycle } from "../types";
import { asaasClient } from "./asaas.client";

export interface CheckoutDTO {
  companyId: string;
  planId: string;
  cycle: BillingCycle;
  paymentMethod: "PIX" | "CREDIT_CARD";
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

export class BillingService {
  /**
   * Lista todos os planos disponíveis
   */
  async listPlans() {
    return prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" }
    });
  }

  /**
   * Obtém os detalhes da assinatura atual de um tenant
   */
  async getSubscriptionDetails(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscription: {
          include: {
            plan: true,
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 12
            }
          }
        }
      }
    });

    if (!company) {
      throw new Error("Empresa não encontrada.");
    }

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        cnpj: company.cnpj
      },
      subscription: company.subscription
    };
  }

  /**
   * Cria ou atualiza a assinatura de um tenant (Checkout com Asaas Real ou Mock)
   */
  async createSubscription(data: CheckoutDTO) {
    const plan = await prisma.plan.findUnique({
      where: { id: data.planId }
    });

    if (!plan) {
      throw new Error("Plano selecionado não existe.");
    }

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      include: { subscription: true }
    });

    if (!company) {
      throw new Error("Empresa não encontrada.");
    }

    const price = data.cycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
    const now = new Date();
    const periodEnd = new Date(
      data.cycle === "ANNUAL"
        ? now.getTime() + 365 * 24 * 60 * 60 * 1000
        : now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    let asaasSubscriptionId: string | undefined = undefined;
    let asaasInvoiceId: string | undefined = undefined;
    let invoiceUrl = `https://fatura.osflow.com.br/invoices/${company.id}`;
    let pixQrCode: string | undefined = "data:image/png;base64,mockQrCode";
    let pixCopyPaste: string | undefined = "00020101021226870014br.gov.bcb.pix2565pix.asaas.com/qr/mock-invoice-payment5204000053039865802BR5915MGV_SAAS6009SAO_PAULO62070503***6304E8A9";
    let invoiceStatus = data.paymentMethod === "CREDIT_CARD" ? "PAID" : "PENDING";

    // 1. Caso o Asaas esteja configurado com API KEY real
    if (asaasClient.isReady()) {
      try {
        // Localiza ou cria cliente no Asaas
        let asaasCustId = company.asaasCustomerId;
        if (!asaasCustId) {
          const customerRes = await asaasClient.findOrCreateCustomer({
            name: company.name,
            cpfCnpj: company.cnpj || undefined,
            email: company.email || undefined,
            phone: company.phone || undefined,
            address: company.address || undefined,
            postalCode: company.zipCode || undefined
          });
          asaasCustId = customerRes.id;
          await prisma.company.update({
            where: { id: company.id },
            data: { asaasCustomerId: asaasCustId }
          });
        }

        // Formata data do próximo vencimento (hoje)
        const nextDueDateStr = now.toISOString().split("T")[0];

        // Cria a assinatura no Asaas
        const subRes = await asaasClient.createSubscription({
          customerId: asaasCustId,
          billingType: data.paymentMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX",
          value: price,
          nextDueDate: nextDueDateStr,
          cycle: data.cycle === "ANNUAL" ? "ANNUALLY" : "MONTHLY",
          description: `Assinatura Plano ${plan.name} (${data.cycle === "ANNUAL" ? "Anual" : "Mensal"}) - OS Flow`,
          creditCard: data.creditCard,
          creditCardHolderInfo: data.creditCard ? {
            name: data.creditCard.holderName,
            email: company.email || "cobranca@osflow.com.br",
            cpfCnpj: (company.cnpj || "00000000000").replace(/\D/g, ""),
            postalCode: (company.zipCode || "14000000").replace(/\D/g, ""),
            addressNumber: "SN",
            phone: (company.phone || "16999999999").replace(/\D/g, "")
          } : undefined
        });

        asaasSubscriptionId = subRes.id;

        // Busca cobrança gerada para a assinatura
        const payments = await asaasClient.getSubscriptionPayments(subRes.id);
        if (payments.length > 0) {
          const primaryPayment = payments[0];
          asaasInvoiceId = primaryPayment.id;
          if (primaryPayment.invoiceUrl) invoiceUrl = primaryPayment.invoiceUrl;
          if (primaryPayment.status === "CONFIRMED" || primaryPayment.status === "RECEIVED") {
            invoiceStatus = "PAID";
          }

          // Se for PIX, busca o QR Code dinâmico do Asaas
          if (data.paymentMethod === "PIX") {
            const pixInfo = await asaasClient.getPixQrCode(primaryPayment.id);
            pixQrCode = `data:image/png;base64,${pixInfo.encodedImage}`;
            pixCopyPaste = pixInfo.payload;
          }
        }
      } catch (err: any) {
        console.error("[Asaas Subscription Error]:", err?.response?.data || err.message);
        throw new Error(err?.response?.data?.errors?.[0]?.description || "Falha ao processar pagamento no Asaas.");
      }
    }

    // 2. Transação no Banco de Dados
    const result = await prisma.$transaction(async (tx) => {
      let sub = company.subscription;

      const newSubStatus = invoiceStatus === "PAID" ? "ACTIVE" : (sub?.status || "TRIAL");

      if (sub) {
        sub = await tx.subscription.update({
          where: { id: sub.id },
          data: {
            planId: plan.id,
            cycle: data.cycle,
            status: newSubStatus as any,
            asaasSubscriptionId: asaasSubscriptionId || sub.asaasSubscriptionId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: null
          }
        });
      } else {
        sub = await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            cycle: data.cycle,
            status: newSubStatus as any,
            asaasSubscriptionId: asaasSubscriptionId || null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
          }
        });
      }

      // Gera a Fatura (Invoice)
      const invoice = await tx.invoice.create({
        data: {
          subscriptionId: sub.id,
          asaasInvoiceId: asaasInvoiceId || null,
          amount: price,
          status: invoiceStatus,
          dueDate: now,
          paidAt: invoiceStatus === "PAID" ? now : null,
          pixQrCode: pixQrCode || null,
          pixCopyPaste: pixCopyPaste || null,
          invoiceUrl
        }
      });

      return { subscription: sub, invoice, plan };
    });

    return result;
  }

  /**
   * Processador de Webhook do Gateway (ex: Asaas)
   */
  async handleWebhook(event: string, payload: any) {
    console.log(`[Billing Webhook Received]: ${event}`, payload);

    // O Asaas envia os dados dentro de payload.payment
    const subscriptionId = payload?.subscriptionId || payload?.payment?.subscription;
    const invoiceId = payload?.invoiceId || payload?.payment?.id;

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { asaasSubscriptionId: subscriptionId },
          data: { 
            status: "ACTIVE",
            trialEndsAt: null
          }
        });
      }
      if (invoiceId) {
        await prisma.invoice.updateMany({
          where: { asaasInvoiceId: invoiceId },
          data: { status: "PAID", paidAt: new Date() }
        });
      }
    } else if (event === "PAYMENT_OVERDUE") {
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { asaasSubscriptionId: subscriptionId },
          data: { status: "PAST_DUE" }
        });
      }
      if (invoiceId) {
        await prisma.invoice.updateMany({
          where: { asaasInvoiceId: invoiceId },
          data: { status: "OVERDUE" }
        });
      }
    } else if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_CANCELED") {
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { asaasSubscriptionId: subscriptionId },
          data: { status: "CANCELED" }
        });
      }
    }

    return { received: true };
  }

  /**
   * Obtém as configurações oficiais de PIX direto da empresa
   */
  async getDirectPixConfig() {
    // Tenta obter de OfficeSetting ou variáveis de ambiente
    let pixKey = process.env.COMPANY_PIX_KEY || "financeiro@osflow.com.br";
    let pixName = process.env.COMPANY_PIX_NAME || "OS-Flow Tecnologia / MGV";
    let pixBank = process.env.COMPANY_PIX_BANK || "Banco Inter / Nu Pagamentos";
    let pixWhatsapp = process.env.COMPANY_WHATSAPP || process.env.VITE_SUPPORT_WHATSAPP || "5516999999999";

    try {
      const settings = await prisma.officeSetting.findMany({
        where: {
          key: {
            in: ["PIX_KEY", "PIX_NAME", "PIX_BANK", "SUPPORT_WHATSAPP"]
          }
        }
      });

      for (const s of settings) {
        if (s.key === "PIX_KEY" && s.value) pixKey = s.value;
        if (s.key === "PIX_NAME" && s.value) pixName = s.value;
        if (s.key === "PIX_BANK" && s.value) pixBank = s.value;
        if (s.key === "SUPPORT_WHATSAPP" && s.value) pixWhatsapp = s.value;
      }
    } catch (err) {
      // Usa os fallbacks definidos acima
    }

    return {
      pixKey,
      pixName,
      pixBank,
      pixWhatsapp
    };
  }

  /**
   * Registra intenção de pagamento via PIX direto
   */
  async notifyDirectPixPayment(companyId: string, planId: string, cycle: BillingCycle) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Plano selecionado não existe.");

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true }
    });
    if (!company) throw new Error("Empresa não encontrada.");

    const price = cycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
    const now = new Date();
    const periodEnd = new Date(
      cycle === "ANNUAL"
        ? now.getTime() + 365 * 24 * 60 * 60 * 1000
        : now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const pixConfig = await this.getDirectPixConfig();

    return await prisma.$transaction(async (tx) => {
      let sub = company.subscription;
      if (sub) {
        sub = await tx.subscription.update({
          where: { id: sub.id },
          data: {
            planId: plan.id,
            cycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
          }
        });
      } else {
        sub = await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            cycle,
            status: "TRIAL",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
          }
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          subscriptionId: sub.id,
          amount: price,
          status: "PENDING",
          dueDate: now,
          pixCopyPaste: pixConfig.pixKey
        }
      });

      return {
        subscription: sub,
        invoice,
        plan,
        pixConfig
      };
    });
  }

  /**
   * Ativação ou extensão manual de assinatura de uma oficina pelo Dono (Owner)
   */
  async manualActivateSubscription(params: {
    companyId: string;
    days?: number;
    planTier?: "STARTER" | "PRO" | "ENTERPRISE";
    notes?: string;
  }) {
    const { companyId, days = 30, planTier = "PRO" } = params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true }
    });

    if (!company) {
      throw new Error(`Empresa com ID "${companyId}" não foi encontrada.`);
    }

    let plan = await prisma.plan.findUnique({
      where: { tier: planTier }
    });

    if (!plan) {
      plan = await prisma.plan.findFirst();
    }

    if (!plan) {
      throw new Error("Nenhum plano cadastrado no sistema para vincular.");
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      let sub = company.subscription;

      if (sub) {
        sub = await tx.subscription.update({
          where: { id: sub.id },
          data: {
            planId: plan.id,
            status: "ACTIVE",
            trialEndsAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
          }
        });
      } else {
        sub = await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            status: "ACTIVE",
            cycle: "MONTHLY",
            trialEndsAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
          }
        });
      }

      // Cria a fatura quitada referente à ativação manual
      const invoice = await tx.invoice.create({
        data: {
          subscriptionId: sub.id,
          amount: plan.priceMonthly,
          status: "PAID",
          dueDate: now,
          paidAt: now,
          invoiceUrl: `manual-activation-${Date.now()}`
        }
      });

      return {
        success: true,
        company: { id: company.id, name: company.name },
        subscription: sub,
        invoice,
        activatedUntil: periodEnd
      };
    });
  }

  /**
   * Lista todas as empresas e assinaturas para o painel administrativo do Dono
   */
  async listAllSubscriptionsForAdmin() {
    return prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cnpj: true,
        email: true,
        phone: true,
        createdAt: true,
        subscription: {
          include: {
            plan: true,
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 3
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}

export const billingService = new BillingService();

