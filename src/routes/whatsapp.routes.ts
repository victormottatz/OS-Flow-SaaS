import { Router } from "express";
import { whatsAppController } from "../controllers/whatsapp.controller";
import { checkPermission } from "../middlewares/auth";

const router = Router();

router.get("/history/:orderId", checkPermission("os.view"), whatsAppController.getHistory.bind(whatsAppController));
router.post("/send-manual", checkPermission("whatsapp.send"), whatsAppController.sendManual.bind(whatsAppController));

// Gerenciamento da Instância Evolution API
router.post("/instance/connect", checkPermission("admin"), whatsAppController.connect.bind(whatsAppController));
router.get("/instance/state", checkPermission("admin"), whatsAppController.getState.bind(whatsAppController));
router.delete("/instance/logout", checkPermission("admin"), whatsAppController.logout.bind(whatsAppController));

export default router;
