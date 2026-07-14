import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

// Apenas OWNER ou ADMIN deveriam ver dados financeiros executivos
router.get("/executive", checkRole(UserRole.OWNER), dashboardController.getExecutiveMetrics.bind(dashboardController));

// Operacional e Técnicos podem ver o status do Kanban e peças críticas
router.get("/operational", dashboardController.getOperationalMetrics.bind(dashboardController));

export default router;
