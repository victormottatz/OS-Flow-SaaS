import { Request, Response } from "express";
import prisma from "../database/prisma";

export class PermissionsController {
  async listUsersWithPermissions(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true
        }
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateUserPermissions(req: Request, res: Response) {
    const { id } = req.params;
    const { permissions } = req.body; // array of strings

    if (!Array.isArray(permissions)) {
      res.status(400).json({ error: "O campo permissions deve ser um array de strings." });
      return;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { permissions },
        select: {
          id: true,
          name: true,
          role: true,
          permissions: true
        }
      });
      res.json(updatedUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const permissionsController = new PermissionsController();
