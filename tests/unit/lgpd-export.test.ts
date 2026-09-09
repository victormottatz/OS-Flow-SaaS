import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../../src/database/prisma";
import { dashboardController } from "../../src/controllers/dashboard.controller";
import { Request, Response } from "express";

describe("LGPD & Portabilidade - exportTenantData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve exportar integralmente os dados do tenant respeitando o isolamento por company_id", async () => {
    const mockCompanyId = "company-tenant-42";

    vi.spyOn(prisma.client, "findMany").mockResolvedValue([
      { id: "c1", name: "Cliente 1", cpfCnpj: "123", phone: "119999", email: "c1@test.com", address: "Rua 1", companyId: mockCompanyId }
    ] as any);

    vi.spyOn(prisma.device, "findMany").mockResolvedValue([
      { id: "d1", model: "iPhone 12", brand: "Apple", serialNumber: "SN123", description: "Aparelho 1" }
    ] as any);

    vi.spyOn(prisma.ordemServico, "findMany").mockResolvedValue([
      { id: "os1", osNumber: 1001, status: "ABERTA", clientId: "c1", deviceId: "d1", reportedDefect: "Tela quebrada", diagnostic: null, totalCost: 200, laborCost: 100, createdAt: new Date() }
    ] as any);

    vi.spyOn(prisma.part, "findMany").mockResolvedValue([
      { id: "p1", name: "Tela LCD", code: "LCD-01", stock: 5, cost: 80, price: 150, ncm: "85285900" }
    ] as any);

    const req: any = {
      headers: {
        "x-company-id": mockCompanyId
      }
    };

    let responseData: any = null;
    const res: any = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data;
      })
    };

    await dashboardController.exportTenantData(req as Request, res as Response);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining(".json")
    );
    expect(responseData).not.toBeNull();
    expect(responseData.version).toContain("LGPD Data Export");
    expect(responseData.counts.clients).toBe(1);
    expect(responseData.counts.devices).toBe(1);
    expect(responseData.counts.orders).toBe(1);
    expect(responseData.counts.parts).toBe(1);
    expect(responseData.data.clients).toHaveLength(1);
  });

  it("deve rejeitar exportação com HTTP 400 se company_id não for identificado", async () => {
    const req: any = {
      headers: {}
    };

    const res: any = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    await dashboardController.exportTenantData(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("companyId")
      })
    );
  });
});
