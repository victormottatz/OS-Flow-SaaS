/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { createDemoLead, getDemoLeads, updateDemoLead } from "../controllers/demo.controller";
import { requireAuth, checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

// Rota pública: Captura de lead do formulário de demonstração
router.post("/leads", createDemoLead);

// Rotas administrativas protegidas (OWNER / ADMIN)
router.get("/leads", requireAuth, checkRole(UserRole.OWNER, UserRole.ADMIN), getDemoLeads);
router.patch("/leads/:id", requireAuth, checkRole(UserRole.OWNER, UserRole.ADMIN), updateDemoLead);

export default router;
