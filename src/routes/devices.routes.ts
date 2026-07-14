import { Router } from "express";
import { devicesController } from "../controllers/devices.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.post("/", devicesController.create.bind(devicesController));
router.put("/:id", devicesController.update.bind(devicesController));
router.get("/:id/prontuario", devicesController.getProntuario.bind(devicesController));
router.get("/:id/notes", devicesController.getNotes.bind(devicesController));
router.post("/:id/notes", devicesController.createNote.bind(devicesController));
router.put("/:id/warranty", devicesController.updateWarranty.bind(devicesController));

router.get("/categories", devicesController.getCategories.bind(devicesController));
router.post("/categories", checkRole(UserRole.OWNER), devicesController.createCategory.bind(devicesController));

export default router;
