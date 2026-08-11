import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../types";
import prisma from "../database/prisma";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("[CRITICAL SECURITY WARNING] JWT_SECRET não configurada em ambiente de produção!");
}

const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";

// Rotas publicas
const PUBLIC_PATHS = [
  "/api/portal/",
  "/api/auth/login",
  "/api/auth/register",
];

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  // Blindagem de Segurança (Rule 01): Deletar headers injetados externamente pelo cliente
  delete req.headers["x-user-role"];
  delete req.headers["x-user-id"];
  delete req.headers["x-user-email"];

  const reqPath = req.path;

  if (
    !reqPath.startsWith("/api/") ||
    PUBLIC_PATHS.some(p => reqPath.startsWith(p))
  ) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    req.headers["x-user-role"] = decoded.role;
    req.headers["x-user-id"] = decoded.id;
    req.headers["x-user-email"] = decoded.email;
  } catch (err) {
    // Token inválido: headers foram previamente removidos
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    res.status(401).json({ error: "Acesso negado. Usuário não autenticado." });
    return;
  }
  next();
}

export function checkRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers["x-user-role"] as string;

    if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
      res.status(403).json({
        error: "Acesso negado. Permissao insuficiente."
      });
      return;
    }

    next();
  };
}

export function checkPermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.headers["x-user-id"] as string;
    const userRole = req.headers["x-user-role"] as string;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    if (userRole === "OWNER") {
      return next(); 
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { permissions: true }
      });

      if (!user) {
        res.status(401).json({ error: "Usuário não encontrado." });
        return;
      }

      // Busca as permissões padrão atribuídas ao Perfil (Role) na tabela RolePermission
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: userRole as any },
        select: { permission: true }
      });

      const allPermissions = [
        ...(user.permissions || []),
        ...rolePermissions.map(rp => rp.permission)
      ];

      const hasAll = requiredPermissions.every(p => allPermissions.includes(p));
      if (!hasAll) {
        res.status(403).json({ error: "Acesso negado. Permissão insuficiente para o recurso." });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao verificar permissões do usuário." });
    }
  };
}

/**
 * Middleware de autorização OR: autoriza se o usuário possui PELO MENOS UMA
 * das permissões listadas. Útil para rotas compartilhadas entre módulos
 * (ex: peças acessíveis tanto por quem gerencia estoque quanto por quem gerencia OS).
 */
export function checkAnyPermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.headers["x-user-id"] as string;
    const userRole = req.headers["x-user-role"] as string;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado." });
      return;
    }

    if (userRole === "OWNER") {
      return next();
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { permissions: true }
      });

      if (!user) {
        res.status(401).json({ error: "Usuário não encontrado." });
        return;
      }

      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: userRole as any },
        select: { permission: true }
      });

      const allPermissions = [
        ...(user.permissions || []),
        ...rolePermissions.map(rp => rp.permission)
      ];

      const hasAny = requiredPermissions.some(p => allPermissions.includes(p));
      if (!hasAny) {
        res.status(403).json({ error: "Acesso negado. Permissão insuficiente para o recurso." });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao verificar permissões do usuário." });
    }
  };
}
