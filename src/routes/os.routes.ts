import { Router } from "express";
import { osController } from "../controllers/os.controller";
import { checkPermission } from "../middlewares/auth";

const router = Router();

router.get("/", checkPermission("os.view"), osController.getAll.bind(osController));
router.get("/:id", checkPermission("os.view"), osController.getById.bind(osController));
router.get("/:id/history", checkPermission("os.view"), osController.getHistory.bind(osController));
router.post("/:id/history/note", checkPermission("os.edit"), osController.addHistoryNote.bind(osController));
router.patch("/:id/technician", checkPermission("os.edit"), osController.assignTechnician.bind(osController));
router.post("/", checkPermission("os.create"), osController.create.bind(osController));
router.put("/:id", checkPermission("os.edit"), osController.update.bind(osController));
router.put("/:id/laudo-fotos", checkPermission("os.edit"), osController.updateLaudoFotos.bind(osController));
router.post("/:id/checklist-saida", checkPermission("os.edit"), osController.updateChecklistSaida.bind(osController));
router.put("/:id/status", checkPermission("os.change_status"), osController.updateStatus.bind(osController));
router.delete("/batch", checkPermission("os.delete"), osController.deleteBatch.bind(osController));
router.delete("/:id", checkPermission("os.delete"), osController.delete.bind(osController));

export default router;
