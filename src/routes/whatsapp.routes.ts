import { Router } from "express";
import { whatsAppController } from "../controllers/whatsapp.controller";
import { checkPermission } from "../middlewares/auth";

const router = Router();

router.get("/history/:orderId", checkPermission("os.view"), whatsAppController.getHistory.bind(whatsAppController));
router.post("/send-manual", checkPermission("whatsapp.send"), whatsAppController.sendManual.bind(whatsAppController));

export default router;
