import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../../src/database/prisma";
import axios from "axios";
import { auditStockAndFiscalDivergences, syncSinglePartFromBling } from "../../src/services/bling";

describe("Stock & Fiscal Audit Divergence Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve detectar divergências de estoque, NCM e itens exclusivos corretamente", async () => {
    // Config Bling com token válido
    vi.spyOn(prisma.blingConfig, "findUnique").mockResolvedValue({
      id: 1,
      accessToken: "mock_token",
      refreshToken: "mock_refresh",
      expiresAt: new Date(Date.now() + 3600 * 1000)
    } as any);

    process.env.BLING_CLIENT_ID = "mock_client";
    process.env.BLING_CLIENT_SECRET = "mock_secret";

    // Peças no banco local MGV
    vi.spyOn(prisma.part, "findMany").mockResolvedValue([
      {
        id: "part-1",
        code: "CABO-01",
        name: "Cabo Flat",
        stock: 10,
        price: 50.0,
        ncm: "85444200",
        unit: "UN",
        deletedAt: null
      },
      {
        id: "part-2",
        code: "PLACA-02",
        name: "Placa Principal",
        stock: 5,
        price: 300.0,
        ncm: "84239029",
        unit: "UN",
        deletedAt: null
      },
      {
        id: "part-3",
        code: "FONTE-03",
        name: "Fonte 12V",
        stock: 2,
        price: 80.0,
        ncm: "85044021",
        unit: "UN",
        deletedAt: null
      }
    ] as any);

    // Mock axios para produtos e saldos do Bling
    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.includes("/produtos")) {
        return {
          data: {
            data: [
              {
                id: 101,
                codigo: "CABO-01",
                nome: "Cabo Flat",
                preco: 50.0,
                ncm: "85444200",
                unidade: "UN",
                tipo: "P",
                situacao: "A"
              },
              {
                id: 102,
                codigo: "PLACA-02",
                nome: "Placa Principal",
                preco: 300.0,
                ncm: "84239000", // NCM Divergente!
                unidade: "UN",
                tipo: "P",
                situacao: "A"
              },
              {
                id: 104,
                codigo: "TECLADO-04",
                nome: "Teclado Matricial",
                preco: 120.0,
                ncm: "84716052",
                unidade: "UN",
                tipo: "P",
                situacao: "A"
              }
            ]
          }
        } as any;
      }

      if (url.includes("/estoques/saldos")) {
        return {
          data: {
            data: [
              {
                produto: { id: 101 },
                saldoFisicoTotal: 10 // Igual
              },
              {
                produto: { id: 102 },
                saldoFisicoTotal: 3 // Divergente (MGV tem 5, Bling tem 3)
              },
              {
                produto: { id: 104 },
                saldoFisicoTotal: 8
              }
            ]
          }
        } as any;
      }

      return { data: { data: [] } } as any;
    });

    const report = await auditStockAndFiscalDivergences();

    expect(report.totalItems).toBe(4); // 3 do MGV + 1 exclusivo Bling
    expect(report.synchronizedCount).toBe(1); // CABO-01 (100% igual)
    expect(report.qtyDivergenceCount).toBe(1); // PLACA-02 (Estoque 5 vs 3)
    expect(report.onlyMgvCount).toBe(1); // FONTE-03
    expect(report.onlyBlingCount).toBe(1); // TECLADO-04

    const caboItem = report.items.find(i => i.code === "CABO-01");
    expect(caboItem?.status).toBe("OK");

    const placaItem = report.items.find(i => i.code === "PLACA-02");
    expect(placaItem?.status).toBe("QTY_DIVERGENCE");
    expect(placaItem?.divergences.some(d => d.includes("NCM divergente"))).toBe(true);

    const fonteItem = report.items.find(i => i.code === "FONTE-03");
    expect(fonteItem?.status).toBe("ONLY_MGV");

    const tecladoItem = report.items.find(i => i.code === "TECLADO-04");
    expect(tecladoItem?.status).toBe("ONLY_BLING");
  });

  it("deve atualizar os dados e estoque da peça no MGV com syncSinglePartFromBling", async () => {
    vi.spyOn(prisma.part, "findUnique").mockResolvedValue({
      id: "part-123",
      code: "TEST-01",
      stock: 2,
      ncm: "00000000"
    } as any);

    const updateSpy = vi.spyOn(prisma.part, "update").mockResolvedValue({} as any);

    const res = await syncSinglePartFromBling("part-123", {
      stockBling: 8,
      ncmBling: "84239029",
      priceBling: 199.90,
      unitBling: "UN"
    });

    expect(res.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: "part-123" },
      data: {
        stock: 8,
        ncm: "84239029",
        price: 199.90,
        unit: "UN"
      }
    });
  });
});
