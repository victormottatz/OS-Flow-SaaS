import { Router } from "express";
import { portalController } from "../controllers/portal.controller";

const router = Router();

router.get("/os", portalController.getOS.bind(portalController));
router.post("/os/approve", portalController.approveOS.bind(portalController));

export default router;
