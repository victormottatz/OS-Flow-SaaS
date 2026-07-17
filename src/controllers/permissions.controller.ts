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

  async getRolePermissions(req: Request, res: Response) {
    try {
      const rolePermissions = await prisma.rolePermission.findMany({
        select: {
          role: true,
          permission: true
        }
      });
      res.json(rolePermissions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateRolePermissions(req: Request, res: Response) {
    const { rolePermissions } = req.body; // array of { role: string, permissions: string[] }

    if (!Array.isArray(rolePermissions)) {
      res.status(400).json({ error: "O campo rolePermissions deve ser um array." });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const item of rolePermissions) {
          const { role, permissions } = item;
          
          // 1. Deleta as antigas permissões dessa Role específica
          await tx.rolePermission.deleteMany({
            where: { role: role as any }
          });

          // 2. Insere as novas permissões
          if (permissions && permissions.length > 0) {
            await tx.rolePermission.createMany({
              data: permissions.map((p: string) => ({
                role: role as any,
                permission: p
              }))
            });
          }
        }
      });

      res.json({ success: true, message: "Permissões de perfis atualizadas com sucesso." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const permissionsController = new PermissionsController();
