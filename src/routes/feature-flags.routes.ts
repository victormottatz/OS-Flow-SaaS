import { Router } from "express";
import { featureFlagsController } from "../controllers/feature-flags.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.get("/", featureFlagsController.getPublicFlags.bind(featureFlagsController));
router.get("/admin", checkRole(UserRole.OWNER), featureFlagsController.getAdminFlags.bind(featureFlagsController));
router.post("/toggle", checkRole(UserRole.OWNER), featureFlagsController.toggleFlag.bind(featureFlagsController));

export default router;
