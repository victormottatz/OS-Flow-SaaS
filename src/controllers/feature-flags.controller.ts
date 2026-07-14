import { Request, Response } from "express";
import prisma from "../database/prisma";
import { featureFlags } from "../services/FeatureFlagService";

export class FeatureFlagsController {
  async getPublicFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await prisma.featureFlag.findMany();
      const flagMap = flags.reduce((acc, flag) => {
        acc[flag.key] = flag.value;
        return acc;
      }, {} as Record<string, boolean>);
      res.json(flagMap);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAdminFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await prisma.featureFlag.findMany({
        orderBy: { updatedAt: 'desc' }
      });
      res.json(flags);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async toggleFlag(req: Request, res: Response): Promise<void> {
    const { key, value, description } = req.body;
    if (!key) {
      res.status(400).json({ error: "O campo 'key' é obrigatório." });
      return;
    }
    try {
      const flag = await prisma.featureFlag.upsert({
        where: { key },
        update: { value: Boolean(value), description },
        create: { key, value: Boolean(value), description }
      });
      featureFlags.invalidate(); // Limpa o cache após alteração
      res.json(flag);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const featureFlagsController = new FeatureFlagsController();
