import { Request, Response, NextFunction } from "express";
import prisma from "../database/prisma";
import { getTenantId } from "./auth";

/**
 * Rotas que não devem ser bloqueadas mesmo com assinatura vencida
 * (para que o dono consiga acessar o módulo de pagamento e regularizar a conta)
 */
const EXEMPT_PATHS = [
  "/api/billing",
  "/api/auth/profile",
  "/api/auth/logout",
];

export async function tenantSubscriptionGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const companyId = getTenantId(req);

  // Se for rota pública ou não tiver tenant ainda, deixa passar para middlewares específicos tratarem
  if (!companyId) {
    return next();
  }

  // Paywall Inteligente: Leitura (GET) é permitida para consulta histórica e portabilidade LGPD
  if (req.method === "GET") {
    return next();
  }

  const reqPath = req.path;
  if (EXEMPT_PATHS.some(p => reqPath.startsWith(p))) {
    return next();
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!company || !company.active) {
      res.status(403).json({
        error: "Esta empresa está desativada no sistema. Entre em contato com o suporte.",
        code: "COMPANY_DEACTIVATED"
      });
      return;
    }

    const sub = company.subscription;

    // Se ainda não tiver assinatura configurada, permite fluxo inicial
    if (!sub) {
      return next();
    }

    const now = new Date();

    // Validação de Período de Teste (Trial)
    if (sub.status === "TRIAL") {
      if (sub.trialEndsAt && sub.trialEndsAt < now) {
        res.status(402).json({
          error: "O período de testes gratuitos (Trial de 14 dias) expirou. Escolha um plano para continuar utilizando o sistema.",
          code: "TRIAL_EXPIRED",
          subscriptionId: sub.id,
          plan: sub.plan.name
        });
        return;
      }
    }

    // Validação de Status Cancelado ou Inadimplente
    if (sub.status === "CANCELED" || sub.status === "UNPAID") {
      res.status(402).json({
        error: "Sua assinatura está suspensa por falta de pagamento. Regularize para reativar o acesso.",
        code: "SUBSCRIPTION_SUSPENDED",
        subscriptionId: sub.id
      });
      return;
    }

    next();
  } catch (err) {
    console.error("[TenantGuard Error]:", err);
    next();
  }
}
