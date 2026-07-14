import { Router } from "express";
import { searchController } from "../controllers/search.controller";

const router = Router();

router.get("/", searchController.globalSearch.bind(searchController));

export default router;
