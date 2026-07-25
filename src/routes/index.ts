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

const router = Router();

router.use("/auth", authRoutes);
router.use("/feature-flags", featureFlagsRoutes);
router.use("/config", globalConfigRoutes);
router.use("/clients", clientsRoutes);
router.use("/parts", partsRoutes);
router.use("/devices", devicesRoutes);
router.use("/ordens-servico", osRoutes);
router.use("/dashboards", dashboardRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/search", searchRoutes);
router.use("/portal", portalRoutes);
router.use("/conciliacao", conciliationRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/integration", integrationRoutes);

export default router;
