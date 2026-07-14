import { Router } from "express";
import { partsController } from "../controllers/parts.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.get("/", partsController.getAll.bind(partsController));
router.post("/", partsController.create.bind(partsController));
router.put("/:id", partsController.update.bind(partsController));
// Apenas OWNER ou ADMIN deveriam poder deletar peças do estoque
router.delete("/:id", checkRole(UserRole.OWNER), partsController.delete.bind(partsController));

export default router;
