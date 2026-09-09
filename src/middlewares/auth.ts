import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../types";
import prisma from "../database/prisma";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("[CRITICAL SECURITY WARNING] JWT_SECRET não configurada em ambiente de produção!");
}

const JWT_SECRET = process.env.JWT_SECRET || "osflow_super_secure_jwt_secret_key_2026!";

// Rotas publicas
const PUBLIC_PATHS = [
  "/api/portal/",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/register-tenant",
  "/api/billing/webhook",
  "/api/plans",
];

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  // Blindagem de Segurança (Rule 01 & Multi-Tenant): Deletar headers injetados externamente pelo cliente
  delete req.headers["x-user-role"];
  delete req.headers["x-user-id"];
  delete req.headers["x-user-email"];
  delete req.headers["x-company-id"];

  const reqPath = req.path;

  if (
    !reqPath.startsWith("/api/") ||
    PUBLIC_PATHS.some(p => reqPath.startsWith(p))
  ) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query?.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      id: string; 
      email: string; 
      role: string;
      companyId?: string | null;
    };
    req.headers["x-user-role"] = decoded.role;
    req.headers["x-user-id"] = decoded.id;
    req.headers["x-user-email"] = decoded.email;
    if (decoded.companyId) {
      req.headers["x-company-id"] = decoded.companyId;
      (req as any).companyId = decoded.companyId;
    }
    (req as any).user = decoded;
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

/**
 * Extrai o ID da empresa (Tenant) atual da requisição autenticada de forma segura
 */
export function getTenantId(req: Request): string | undefined {
  return (req as any).companyId || (req.headers["x-company-id"] as string | undefined);
}

/**
 * Middleware que obriga a requisição a pertencer a um Tenant ativo
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const companyId = getTenantId(req);
  if (!companyId) {
    res.status(403).json({ error: "Contexto de empresa (Tenant) não identificado. Faça login novamente." });
    return;
  }
  next();
}

/**
 * Middleware que verifica se a assinatura da empresa está ativa ou dentro do período de Trial.
 * Permite requisições de consulta (GET) para não bloquear o acesso histórico aos dados,
 * mas bloqueia mutações críticas (POST, PUT, DELETE) caso a mensalidade esteja atrasada ou o trial vencido.
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Permite consultas GET e rotas do próprio módulo de cobrança/perfil
  if (req.method === "GET" || req.path.startsWith("/api/billing") || req.path.startsWith("/api/auth")) {
    return next();
  }

  const companyId = getTenantId(req);
  if (!companyId) {
    res.status(403).json({ error: "Empresa não identificada." });
    return;
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true }
    });

    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada." });
      return;
    }

    const sub = company.subscription;
    const now = new Date();

    if (!sub) {
      // Se não houver registro de assinatura, verifica se foi criada há mais de 14 dias
      const createdTime = company.createdAt ? new Date(company.createdAt).getTime() : now.getTime();
      const diffDays = (now.getTime() - createdTime) / (1000 * 60 * 60 * 24);
      if (diffDays > 14) {
        res.status(402).json({
          error: "Período de avaliação de 14 dias expirado. Ative um plano para continuar gerando novas ordens e clientes.",
          subscriptionRequired: true
        });
        return;
      }
      return next();
    }

    if (sub.status === "ACTIVE") {
      return next();
    }

    if (sub.status === "TRIAL") {
      if (sub.trialEndsAt && sub.trialEndsAt < now) {
        res.status(402).json({
          error: "Seu período de teste gratuito de 14 dias chegou ao fim. Escolha um plano para continuar utilizando o sistema.",
          subscriptionRequired: true
        });
        return;
      }
      return next();
    }

    if (sub.status === "PAST_DUE" || sub.status === "UNPAID" || sub.status === "CANCELED") {
      res.status(402).json({
        error: "Sua assinatura do OS Flow encontra-se pendente ou cancelada. Regularize o pagamento para continuar emitindo e operando.",
        subscriptionRequired: true,
        status: sub.status
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error("[requireActiveSubscription Error]:", err);
    // Em caso de falha de conexão, não bloqueia a operação emergencial
    next();
  }
}


