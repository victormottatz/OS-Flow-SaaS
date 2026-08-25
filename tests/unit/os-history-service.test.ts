import { describe, it, expect, vi, beforeEach } from "vitest";
import { OSHistoryService } from "../../src/services/OSHistoryService";
import prisma from "../../src/database/prisma";

// Mock do prisma
vi.mock("../../src/database/prisma", () => ({
  default: {
    oSHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("OSHistoryService - Auditoria e Timeline de Ordens de Serviço", () => {
  let service: OSHistoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OSHistoryService();
  });

  it("deve gravar evento de histórico com dados corretos", async () => {
    (prisma.oSHistory.create as any).mockResolvedValue({
      id: "hist-123",
      orderId: "os-456",
      userId: "user-789",
      userName: "Carlos Técnico",
      userRole: "TECHNICIAN",
      actionType: "STATUS_CHANGE",
      description: "Mudou o status de Aguardando Avaliação para Em Manutenção",
      metadata: { fromStatus: "AGUARDANDO_AVALIACAO", toStatus: "EM_MANUTENCAO" },
      createdAt: new Date(),
    });

    await service.record({
      orderId: "os-456",
      userId: "user-789",
      userName: "Carlos Técnico",
      userRole: "TECHNICIAN",
      actionType: "STATUS_CHANGE",
      description: "Mudou o status de Aguardando Avaliação para Em Manutenção",
      metadata: { fromStatus: "AGUARDANDO_AVALIACAO", toStatus: "EM_MANUTENCAO" },
    });

    expect(prisma.oSHistory.create).toHaveBeenCalledTimes(1);
    expect(prisma.oSHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: "os-456",
        userId: "user-789",
        userName: "Carlos Técnico",
        userRole: "TECHNICIAN",
        actionType: "STATUS_CHANGE",
        description: "Mudou o status de Aguardando Avaliação para Em Manutenção",
        metadata: { fromStatus: "AGUARDANDO_AVALIACAO", toStatus: "EM_MANUTENCAO" },
      },
    });
  });

  it("deve lidar defensivamente caso ocorra erro ao gravar no banco sem quebrar a aplicação", async () => {
    (prisma.oSHistory.create as any).mockRejectedValue(new Error("Falha de conexão com DB"));

    // Não deve lançar erro
    await expect(
      service.record({
        orderId: "os-456",
        actionType: "NOTE_ADDED",
        description: "Aparelho necessita limpeza",
      })
    ).resolves.not.toThrow();
  });

  it("deve buscar o histórico ordenado por data decrescente", async () => {
    const mockList = [
      {
        id: "hist-2",
        orderId: "os-456",
        actionType: "STATUS_CHANGE",
        description: "Em manutenção",
        createdAt: new Date("2026-08-25T14:00:00Z"),
      },
      {
        id: "hist-1",
        orderId: "os-456",
        actionType: "CREATED",
        description: "OS Criada",
        createdAt: new Date("2026-08-25T10:00:00Z"),
      },
    ];

    (prisma.oSHistory.findMany as any).mockResolvedValue(mockList);

    const history = await service.getOrderHistory("os-456");

    expect(prisma.oSHistory.findMany).toHaveBeenCalledWith({
      where: { orderId: "os-456" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(history).toEqual(mockList);
  });
});
