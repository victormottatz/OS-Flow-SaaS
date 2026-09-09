import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireActiveSubscription } from "../../src/middlewares/auth";
import prisma from "../../src/database/prisma";
import { Request, Response, NextFunction } from "express";

describe("Paywall Middleware - requireActiveSubscription", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve permitir requisições de leitura GET mesmo com assinatura vencida", async () => {
    const req: any = {
      method: "GET",
      path: "/api/ordens-servico",
      headers: { "x-company-id": "company-vencida-1" }
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await requireActiveSubscription(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("deve bloquear mutações (POST) com HTTP 402 se o trial estiver vencido", async () => {
    const dataPassada = new Date(Date.now() - 24 * 3600 * 1000); // Ontem
    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      id: "company-expirada-2",
      name: "Oficina Vencida",
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      subscription: {
        status: "TRIAL",
        trialEndsAt: dataPassada
      }
    } as any);

    const req: any = {
      method: "POST",
      path: "/api/ordens-servico",
      headers: { "x-company-id": "company-expirada-2" }
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await requireActiveSubscription(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionRequired: true
      })
    );
  });

  it("deve permitir mutações (POST) se a empresa estiver com plano ACTIVE", async () => {
    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      id: "company-ativa-3",
      name: "Oficina Em Dia",
      createdAt: new Date(),
      subscription: {
        status: "ACTIVE",
        trialEndsAt: null
      }
    } as any);

    const req: any = {
      method: "POST",
      path: "/api/ordens-servico",
      headers: { "x-company-id": "company-ativa-3" }
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await requireActiveSubscription(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("deve permitir mutações (POST) se a empresa estiver com TRIAL válido dentro dos 14 dias", async () => {
    const dataFutura = new Date(Date.now() + 7 * 24 * 3600 * 1000); // Mais 7 dias de trial
    vi.spyOn(prisma.company, "findUnique").mockResolvedValue({
      id: "company-trial-valido",
      name: "Oficina Nova",
      createdAt: new Date(),
      subscription: {
        status: "TRIAL",
        trialEndsAt: dataFutura
      }
    } as any);

    const req: any = {
      method: "POST",
      path: "/api/clients",
      headers: { "x-company-id": "company-trial-valido" }
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await requireActiveSubscription(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("deve permitir rotas isentas como /api/billing ou /api/plans mesmo para inadimplentes", async () => {
    const req: any = {
      method: "POST",
      path: "/api/billing/checkout",
      headers: { "x-company-id": "company-vencida-qualquer" }
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await requireActiveSubscription(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
