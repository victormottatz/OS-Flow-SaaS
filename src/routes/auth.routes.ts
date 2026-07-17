import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { checkRole, requireAuth } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.post("/login", authController.login.bind(authController));
router.post("/register", authController.register.bind(authController));
router.get("/users", checkRole(UserRole.OWNER), authController.getUsers.bind(authController));
router.delete("/users/:id", checkRole(UserRole.OWNER), authController.deleteUser.bind(authController));

router.get("/users/:id/permissions", checkRole(UserRole.OWNER, UserRole.ADMIN), authController.getUserPermissions.bind(authController));
router.put("/users/:id/permissions", checkRole(UserRole.OWNER, UserRole.ADMIN), authController.updateUserPermissions.bind(authController));

router.get("/profile", requireAuth, authController.getProfile.bind(authController));
router.put("/profile", requireAuth, authController.updateProfile.bind(authController));

export default router;
