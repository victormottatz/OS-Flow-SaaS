import { Router } from "express";
import prisma from "../database/prisma";
import { checkRole } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

// GET /api/config
router.get("/", checkRole(UserRole.OWNER, UserRole.ADMIN), async (req, res) => {
  try {
    const settings = await prisma.officeSetting.findMany();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar configurações globais." });
  }
});

// PUT /api/config/:key
router.put("/:key", checkRole(UserRole.OWNER, UserRole.ADMIN), async (req, res) => {
  const { key } = req.params;
  const { value, category, description, type } = req.body;
  try {
    const existing = await prisma.officeSetting.findFirst({ where: { key } });
    if (existing) {
      const updated = await prisma.officeSetting.update({
        where: { id: existing.id },
        data: { value, category, description, type }
      });
      res.json(updated);
    } else {
      const defaultCompany = await prisma.company.findFirst();
      const created = await prisma.officeSetting.create({
        data: {
          companyId: defaultCompany?.id || null,
          key,
          value,
          category,
          description,
          type
        }
      });
      res.json(created);
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar configuração." });
  }
});

export default router;
