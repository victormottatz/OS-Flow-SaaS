import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

router.post("/login", authController.login.bind(authController));
router.post("/register", authController.register.bind(authController));
router.get("/users", checkRole(UserRole.OWNER), authController.getUsers.bind(authController));
router.delete("/users/:id", checkRole(UserRole.OWNER), authController.deleteUser.bind(authController));

export default router;
