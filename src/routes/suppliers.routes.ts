import { Router } from "express";
import { SuppliersController } from "../controllers/suppliers.controller";
import { checkPermission } from "../middlewares/auth";

const router = Router();
const controller = new SuppliersController();

router.get("/", checkPermission("parts.view"), controller.getAll.bind(controller));
router.get("/:id", checkPermission("parts.view"), controller.getById.bind(controller));
router.post("/", checkPermission("parts.manage"), controller.create.bind(controller));
router.put("/:id", checkPermission("parts.manage"), controller.update.bind(controller));
router.delete("/:id", checkPermission("parts.manage"), controller.delete.bind(controller));

export default router;
