import { Router } from "express";
import { billingController } from "../controllers/billing.controller";
import { requireAuth, requireTenant, checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

// Rota pública para listar os planos da Landing Page / Tela de Preços
router.get("/plans", billingController.getPlans.bind(billingController));

// Dados públicos / comerciais de PIX Direto da empresa
router.get("/pix-config", billingController.getPixConfig.bind(billingController));

// Webhook do gateway de pagamentos (sem autenticação de sessão, validado pelo endpoint)
router.post("/webhook", billingController.handleWebhook.bind(billingController));

// Rotas autenticadas do tenant
router.get("/subscription", requireAuth, requireTenant, billingController.getSubscription.bind(billingController));
router.post("/checkout", requireAuth, requireTenant, billingController.checkout.bind(billingController));
router.post("/notify-pix", requireAuth, requireTenant, billingController.notifyDirectPix.bind(billingController));

// Rotas Administrativas Exclusivas do Proprietário (SaaS Owner)
router.post("/admin/activate", requireAuth, checkRole(UserRole.OWNER), billingController.adminActivate.bind(billingController));
router.get("/admin/subscriptions", requireAuth, checkRole(UserRole.OWNER), billingController.adminListSubscriptions.bind(billingController));

export default router;

