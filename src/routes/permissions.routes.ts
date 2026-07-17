import { Router } from "express";
import { permissionsController } from "../controllers/permissions.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

// Apenas OWNER ou ADMIN podem ver ou alterar permissões
router.use(checkRole(UserRole.OWNER, UserRole.ADMIN));

router.get("/", permissionsController.listUsersWithPermissions.bind(permissionsController));
router.get("/roles", permissionsController.getRolePermissions.bind(permissionsController));
router.post("/roles", permissionsController.updateRolePermissions.bind(permissionsController));
router.put("/:id", permissionsController.updateUserPermissions.bind(permissionsController));

export default router;
