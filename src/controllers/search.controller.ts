import { Request, Response } from "express";
import prisma from "../database/prisma";

export class SearchController {
  async globalSearch(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      if (!q || q.length < 2) {
        res.json({ clients: [], os: [], devices: [], parts: [] });
        return;
      }

      const userId = req.headers["x-user-id"] as string;
      const userRole = req.headers["x-user-role"] as string;

      let permissions: string[] = [];
      if (userRole !== "OWNER") {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { permissions: true }
        });
        if (user) {
          permissions = user.permissions;
        }
      }

      // Helper function to check if the user has permission (Owner always has)
      const can = (perm: string) => userRole === "OWNER" || permissions.includes(perm);

      const limit = 5;

      const [clients, os, devices, parts] = await Promise.all([
        // Clientes
        can("can_view_clients") ? prisma.client.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { cpfCnpj: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } }
            ]
          },
          take: limit
        }) : Promise.resolve([]),

        // OS
        can("can_view_os") ? prisma.ordemServico.findMany({
          where: {
            deletedAt: null,
            OR: [
              { osNumber: { contains: q, mode: "insensitive" } },
              { reportedDefect: { contains: q, mode: "insensitive" } },
              { diagnostic: { contains: q, mode: "insensitive" } }
            ]
          },
          take: limit
        }) : Promise.resolve([]),

        // Equipamentos
        can("can_view_devices") ? prisma.device.findMany({
          where: {
            deletedAt: null,
            OR: [
              { serialNumber: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } }
            ]
          },
          take: limit
        }) : Promise.resolve([]),

        // Peças
        can("can_view_inventory") ? prisma.part.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } }
            ]
          },
          take: limit
        }) : Promise.resolve([])
      ]);

      res.json({
        clients,
        os,
        devices,
        parts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const searchController = new SearchController();
