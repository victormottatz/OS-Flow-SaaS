import { Router } from "express";
import { partsController } from "../controllers/parts.controller";
import { checkPermission, checkAnyPermission } from "../middlewares/auth";

const router = Router();

router.get("/", checkPermission("parts.view"), partsController.getAll.bind(partsController));
router.get("/:id", checkAnyPermission("parts.view", "os.manage", "os.view"), partsController.getById.bind(partsController));
router.post("/", checkPermission("parts.manage"), partsController.create.bind(partsController));
router.put("/:id", checkPermission("parts.manage"), partsController.update.bind(partsController));
router.delete("/:id", checkPermission("parts.manage"), partsController.delete.bind(partsController));

export default router;
