import { Router } from "express";
import { getTags, createTag, updateTag, deleteTag } from "../controllers/tags.controller";
import { requireAuth } from "../middlewares/auth";

// NOTA: o authenticateJWT é aplicado GLOBALMENTE em server.ts (app.use(authenticateJWT)).
// NÃO reaplicar aqui dentro do router: o req.path dentro de um router montado
// (ex.: "/") não começa com "/api/", então o middleware apagaria os headers
// x-user-id/x-user-role (blindagem anti-spoofing) e retornaria cedo sem
// re-verificar o token — fazendo o requireAuth responder 401.
const router = Router();

router.get("/", getTags);
router.post("/", requireAuth, createTag);
router.put("/:id", requireAuth, updateTag);
router.delete("/:id", requireAuth, deleteTag);

export default router;
