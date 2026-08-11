import { Request, Response } from "express";
import prisma from "../database/prisma";
import { TagScope } from "../types";

const MANAGER_ROLES = ["OWNER", "ADMIN", "SUPERVISOR"];

const VALID_SCOPES: TagScope[] = ["GLOBAL", "CLIENT", "DEVICE", "ORDEM_SERVICO"];

function getUserId(req: Request): string | null {
  return (req.headers["x-user-id"] as string) || null;
}

function getUserRole(req: Request): string | null {
  return (req.headers["x-user-role"] as string) || null;
}

function isManager(req: Request): boolean {
  const role = getUserRole(req) || "";
  return MANAGER_ROLES.includes(role);
}

/**
 * Um usuário pode editar/excluir uma etiqueta se:
 *  - for gestor (OWNER/ADMIN/SUPERVISOR); OU
 *  - for o dono da etiqueta pessoal (ownerId === userId).
 * Etiquetas da oficina (ownerId NULL) só são alteradas por gestores.
 */
function canManageTag(req: Request, tag: { ownerId: string | null }): boolean {
  if (isManager(req)) return true;
  const userId = getUserId(req);
  return tag.ownerId !== null && !!userId && tag.ownerId === userId;
}

export const getTags = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const scope = (req.query.scope as string) || undefined;

    const where: any = {};

    if (scope) {
      if (!VALID_SCOPES.includes(scope as TagScope)) {
        res.status(422).json({ error: "Escopo inválido para filtro de etiquetas." });
        return;
      }
      where.scope = scope;
    }

    // Visibilidade: gestores veem tudo; demais usuários veem as etiquetas da
    // oficina (ownerId NULL) + as suas próprias etiquetas pessoais.
    if (!isManager(req)) {
      where.OR = [{ ownerId: null }, { ownerId: userId }];
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ ownerId: "asc" }, { name: "asc" }],
      include: {
        owner: { select: { id: true, name: true } }
      }
    });

    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar etiquetas" });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, colorHex, scope, description, global } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    if (!name || !name.trim()) {
      res.status(422).json({ error: "O nome da etiqueta é obrigatório." });
      return;
    }

    if (scope !== undefined && !VALID_SCOPES.includes(scope as TagScope)) {
      res.status(422).json({ error: "Escopo inválido para a etiqueta." });
      return;
    }

    const resolvedScope: TagScope = VALID_SCOPES.includes(scope)
      ? (scope as TagScope)
      : "GLOBAL";

    // Apenas gestores criam etiquetas da oficina (compartilhadas, ownerId NULL).
    // Demais usuários criam etiquetas pessoais (ownerId = usuário autenticado).
    const wantsGlobal = global === true || global === "true";
    const ownerId = wantsGlobal && isManager(req) ? null : userId;

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        colorHex: colorHex || "#94a3b8",
        scope: resolvedScope,
        description: description || "",
        ownerId
      },
      include: {
        owner: { select: { id: true, name: true } }
      }
    });

    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar etiqueta" });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, colorHex, scope, description } = req.body;

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Etiqueta não encontrada." });
      return;
    }

    if (!canManageTag(req, existing)) {
      res.status(403).json({ error: "Você só pode editar suas próprias etiquetas pessoais." });
      return;
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (colorHex !== undefined) data.colorHex = colorHex;
    if (scope !== undefined) {
      if (!VALID_SCOPES.includes(scope as TagScope)) {
        res.status(422).json({ error: "Escopo inválido para a etiqueta." });
        return;
      }
      data.scope = scope;
    }
    if (description !== undefined) data.description = description;

    const tag = await prisma.tag.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true } }
      }
    });

    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar etiqueta" });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Etiqueta não encontrada." });
      return;
    }

    if (!canManageTag(req, existing)) {
      res.status(403).json({ error: "Você só pode excluir suas próprias etiquetas pessoais." });
      return;
    }

    await prisma.tag.delete({ where: { id } });
    res.json({ message: "Etiqueta removida" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir etiqueta" });
  }
};
