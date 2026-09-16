import { Router } from "express";
import authRoutes from "./auth.routes";
import featureFlagsRoutes from "./feature-flags.routes";
import globalConfigRoutes from "./global-config.routes";
import clientsRoutes from "./clients.routes";
import partsRoutes from "./parts.routes";
import devicesRoutes from "./devices.routes";
import osRoutes from "./os.routes";
import dashboardRoutes from "./dashboard.routes";
import permissionsRoutes from "./permissions.routes";
import searchRoutes from "./search.routes";
import portalRoutes from "./portal.routes";
import conciliationRoutes from "./conciliation.routes";
import whatsappRoutes from "./whatsapp.routes";
import integrationRoutes from "./integration.routes";
import tagsRoutes from "./tags.routes";
import suppliersRoutes from "./suppliers.routes";
import customFieldsRoutes from "./customFields.routes";
import documentsRoutes from "./documents.routes";
import billingRoutes from "./billing.routes";
import demoRoutes from "./demo.routes";

import { requireActiveSubscription } from "../middlewares/auth";

const router = Router();

router.use("/auth", authRoutes);
router.use("/billing", billingRoutes);
router.use("/demo", demoRoutes);
router.use("/feature-flags", featureFlagsRoutes);
router.use("/config", globalConfigRoutes);
router.use("/portal", portalRoutes);

// Rotas operacionais com verificação de assinatura ativa (bloqueio gracioso para inadimplentes)
router.use("/clients", requireActiveSubscription, clientsRoutes);
router.use("/parts", requireActiveSubscription, partsRoutes);
router.use("/devices", requireActiveSubscription, devicesRoutes);
router.use("/ordens-servico", requireActiveSubscription, osRoutes);
router.use("/dashboards", dashboardRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/search", searchRoutes);
router.use("/conciliacao", conciliationRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/integration", requireActiveSubscription, integrationRoutes);
router.use("/tags", requireActiveSubscription, tagsRoutes);
router.use("/suppliers", requireActiveSubscription, suppliersRoutes);
router.use("/custom-fields", requireActiveSubscription, customFieldsRoutes);
router.use("/documents", requireActiveSubscription, documentsRoutes);

export default router;
