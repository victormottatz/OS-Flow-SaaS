import { Router } from "express";
import { getCustomFields, createCustomField, updateCustomField, deleteCustomField } from "../controllers/customFields.controller";
import { requireAuth, checkRole } from "../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router();

// Requer autenticação
router.use(requireAuth);

// Busca de campos - Aberto a usuários autenticados
router.get("/", getCustomFields);

// Modificações - Restrito a Admin/Owner
router.post("/", checkRole(UserRole.OWNER, UserRole.ADMIN), createCustomField);
router.put("/:id", checkRole(UserRole.OWNER, UserRole.ADMIN), updateCustomField);
router.delete("/:id", checkRole(UserRole.OWNER, UserRole.ADMIN), deleteCustomField);

export default router;
