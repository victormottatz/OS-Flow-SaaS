import { Router } from "express";
import { clientsController } from "../controllers/clients.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.get("/", clientsController.getAll.bind(clientsController));
router.post("/", clientsController.create.bind(clientsController));
router.put("/:id", clientsController.update.bind(clientsController));
router.delete("/:id", checkRole(UserRole.OWNER), clientsController.delete.bind(clientsController));
router.get("/:id/360", clientsController.get360.bind(clientsController));

export default router;
