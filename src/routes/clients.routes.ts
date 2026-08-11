import { Router } from "express";
import { clientsController } from "../controllers/clients.controller";
import { checkPermission } from "../middlewares/auth";

const router = Router();

router.get("/", checkPermission("clients.view"), clientsController.getAll.bind(clientsController));
router.post("/", checkPermission("clients.manage"), clientsController.create.bind(clientsController));
router.put("/:id", checkPermission("clients.manage"), clientsController.update.bind(clientsController));
router.patch("/:id/tags", checkPermission("clients.manage"), clientsController.updateTags.bind(clientsController));
router.delete("/:id", checkPermission("clients.manage"), clientsController.delete.bind(clientsController));
router.get("/:id/360", checkPermission("clients.view"), clientsController.get360.bind(clientsController));
router.get("/cnpj/:cnpj", checkPermission("clients.manage"), clientsController.consultCNPJ.bind(clientsController));

export default router;
