import { Request, Response } from "express";
import { billingService } from "../services/billing.service";
import { getTenantId } from "../middlewares/auth";

export class BillingController {
  async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await billingService.listPlans();
      res.json(plans);
    } catch (err: any) {
      console.error("[Billing getPlans error]:", err);
      res.status(500).json({ error: "Erro ao buscar planos." });
    }
  }

  async getSubscription(req: Request, res: Response): Promise<void> {
    const companyId = getTenantId(req);
    if (!companyId) {
      res.status(401).json({ error: "Tenant não autenticado." });
      return;
    }

    try {
      const details = await billingService.getSubscriptionDetails(companyId);
      res.json(details);
    } catch (err: any) {
      console.error("[Billing getSubscription error]:", err);
      res.status(500).json({ error: err.message || "Erro ao consultar assinatura." });
    }
  }

  async checkout(req: Request, res: Response): Promise<void> {
    const companyId = getTenantId(req);
    if (!companyId) {
      res.status(401).json({ error: "Tenant não autenticado." });
      return;
    }

    const { planId, cycle, paymentMethod, creditCard } = req.body;

    if (!planId || !cycle || !paymentMethod) {
      res.status(400).json({ error: "Parâmetros obrigatórios ausentes (planId, cycle, paymentMethod)." });
      return;
    }

    try {
      const result = await billingService.createSubscription({
        companyId,
        planId,
        cycle,
        paymentMethod,
        creditCard
      });

      res.status(201).json({
        message: "Assinatura ativada com sucesso!",
        ...result
      });
    } catch (err: any) {
      console.error("[Billing checkout error]:", err);
      res.status(400).json({ error: err.message || "Falha ao processar assinatura." });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
    const incomingToken = req.headers["asaas-access-token"] || req.headers["x-asaas-access-token"];

    if (webhookSecret && webhookSecret.trim() !== "" && incomingToken !== webhookSecret) {
      console.warn("[Billing Webhook] Tentativa de acesso com token de webhook inválido.");
      res.status(401).json({ error: "Token de webhook não autorizado." });
      return;
    }

    try {
      const event = req.body?.event || req.headers["x-asaas-event"] as string;
      if (!event) {
        res.status(400).json({ error: "Evento do webhook não especificado." });
        return;
      }

      const result = await billingService.handleWebhook(event, req.body);
      res.json(result);
    } catch (err: any) {
      console.error("[Billing Webhook Error]:", err);
      res.status(500).json({ error: "Erro ao processar webhook." });
    }
  }

  async getPixConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await billingService.getDirectPixConfig();
      res.json(config);
    } catch (err: any) {
      console.error("[Billing getPixConfig error]:", err);
      res.status(500).json({ error: "Erro ao obter dados de PIX." });
    }
  }

  async notifyDirectPix(req: Request, res: Response): Promise<void> {
    const companyId = getTenantId(req);
    if (!companyId) {
      res.status(401).json({ error: "Tenant não autenticado." });
      return;
    }

    const { planId, cycle } = req.body;
    if (!planId || !cycle) {
      res.status(400).json({ error: "Parâmetros planId e cycle são obrigatórios." });
      return;
    }

    try {
      const result = await billingService.notifyDirectPixPayment(companyId, planId, cycle);
      res.status(201).json({
        message: "Intenção de pagamento PIX registrada com sucesso!",
        ...result
      });
    } catch (err: any) {
      console.error("[Billing notifyDirectPix error]:", err);
      res.status(400).json({ error: err.message || "Erro ao registrar PIX." });
    }
  }

  async adminActivate(req: Request, res: Response): Promise<void> {
    const { companyId, days, planTier, notes } = req.body;

    if (!companyId) {
      res.status(400).json({ error: "companyId é obrigatório para ativação manual." });
      return;
    }

    try {
      const result = await billingService.manualActivateSubscription({
        companyId,
        days: Number(days) || 30,
        planTier,
        notes
      });
      res.json({
        message: `Assinatura ativada com sucesso por ${days || 30} dias!`,
        ...result
      });
    } catch (err: any) {
      console.error("[Billing adminActivate error]:", err);
      res.status(400).json({ error: err.message || "Falha ao ativar assinatura manualmente." });
    }
  }

  async adminListSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const list = await billingService.listAllSubscriptionsForAdmin();
      res.json(list);
    } catch (err: any) {
      console.error("[Billing adminListSubscriptions error]:", err);
      res.status(500).json({ error: "Erro ao listar assinaturas administrativas." });
    }
  }
}

export const billingController = new BillingController();

