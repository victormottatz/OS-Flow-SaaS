import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { authenticateJWT, requireAuth } from "../../src/middlewares/auth";
import { Request, Response, NextFunction } from "express";

const TEST_SECRET = process.env.JWT_SECRET || "osflow_super_secure_jwt_secret_key_2026!";

describe("Auth Middleware - Blindagem de Segurança e Injeção de Headers", () => {
  it("deve remover headers x-user-id e x-user-role forjados pelo cliente externo", () => {
    const req: any = {
      path: "/api/ordens-servico",
      headers: {
        "x-user-id": "attacker-id-123",
        "x-user-role": "OWNER",
        "x-user-email": "attacker@evil.com"
      }
    };
    const res: any = {};
    const next = vi.fn();

    authenticateJWT(req as Request, res as Response, next as NextFunction);

    // Deve ter sido despojado de qualquer header fornecido na requisição bruta
    expect(req.headers["x-user-id"]).toBeUndefined();
    expect(req.headers["x-user-role"]).toBeUndefined();
    expect(req.headers["x-user-email"]).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("deve autenticar e preencher headers confiáveis quando um JWT válido for fornecido", () => {
    const token = jwt.sign(
      { id: "valid-user-uuid", email: "user@mgv.com", role: "TECHNICIAN" },
      TEST_SECRET
    );

    const req: any = {
      path: "/api/ordens-servico",
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    const res: any = {};
    const next = vi.fn();

    authenticateJWT(req as Request, res as Response, next as NextFunction);

    expect(req.headers["x-user-id"]).toBe("valid-user-uuid");
    expect(req.headers["x-user-role"]).toBe("TECHNICIAN");
    expect(req.headers["x-user-email"]).toBe("user@mgv.com");
    expect(next).toHaveBeenCalled();
  });

  it("requireAuth deve rejeitar requisições sem x-user-id com HTTP 401", () => {
    const req: any = { headers: {} };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    requireAuth(req as Request, res as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Usuário não autenticado/i) })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
