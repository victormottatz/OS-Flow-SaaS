import { Router } from "express";
import { osController } from "../controllers/os.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.get("/", osController.getAll.bind(osController));
router.post("/", osController.create.bind(osController));
router.put("/:id", osController.update.bind(osController));
router.put("/:id/laudo-fotos", osController.updateLaudoFotos.bind(osController));
router.put("/:id/status", osController.updateStatus.bind(osController));
router.delete("/:id", checkRole(UserRole.OWNER), osController.delete.bind(osController));

export default router;
