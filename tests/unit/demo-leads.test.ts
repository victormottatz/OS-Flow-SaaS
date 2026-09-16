import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../../src/database/prisma";
import { createDemoLead } from "../../src/controllers/demo.controller";

describe("Demo Leads - Captura de Leads do Formulário de Demonstração", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve retornar erro 400 se o nome completo estiver em branco", async () => {
    const req = {
      body: { name: "", phone: "16999998888" },
      headers: {},
      socket: {}
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    await createDemoLead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/nome completo/i) }));
  });

  it("deve retornar erro 400 se o telefone for inválido", async () => {
    const req = {
      body: { name: "João Silva", phone: "123" },
      headers: {},
      socket: {}
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    await createDemoLead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/inválido/i) }));
  });

  it("deve cadastrar um lead com sucesso e retornar status 201", async () => {
    const mockLead = {
      id: "lead-123",
      name: "Assistência Técnica Modelo",
      email: "contato@oficinamodelo.com.br",
      phone: "5516999998888",
      companyName: "Oficina Modelo LTDA",
      cityState: "Ribeirão Preto/SP",
      userCount: 5,
      status: "NEW",
      createdAt: new Date()
    };

    vi.spyOn(prisma.demoLead, "create").mockResolvedValue(mockLead as any);

    const req = {
      body: {
        name: "Assistência Técnica Modelo",
        email: "contato@oficinamodelo.com.br",
        phone: "16999998888",
        companyName: "Oficina Modelo LTDA",
        cityState: "Ribeirão Preto/SP",
        userCount: 5
      },
      headers: {},
      socket: { remoteAddress: "192.168.1.1" }
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    await createDemoLead(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: mockLead
    }));
  });
});
