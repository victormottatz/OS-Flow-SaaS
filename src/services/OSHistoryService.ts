import prisma from "../database/prisma";

export interface RecordOSHistoryParams {
  orderId: string;
  userId?: string | null;
  userName?: string;
  userRole?: string | null;
  actionType:
    | "CREATED"
    | "STATUS_CHANGE"
    | "TECHNICIAN_ASSIGNED"
    | "DIAGNOSTIC_UPDATED"
    | "PARTS_UPDATED"
    | "STRESS_TEST_STARTED"
    | "STRESS_TEST_FINISHED"
    | "NOTE_ADDED"
    | "WARRANTY_TAG_ADDED"
    | "REOPENED"
    | "PAYMENT_REGISTERED"
    | "CLOSED"
    | string;
  description: string;
  metadata?: Record<string, any>;
}

export class OSHistoryService {
  /**
   * Registra uma movimentação ou ação no histórico da OS de forma assíncrona e não bloqueante.
   */
  async record(params: RecordOSHistoryParams): Promise<void> {
    try {
      const {
        orderId,
        userId,
        userName = "Sistema",
        userRole,
        actionType,
        description,
        metadata = {}
      } = params;

      let authorName = userName;
      let authorRole = userRole;

      if (userId && (!authorName || authorName === "Sistema")) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true }
        });
        if (user) {
          authorName = user.name;
          authorRole = authorRole || user.role;
        }
      }

      await prisma.oSHistory.create({
        data: {
          orderId,
          userId: userId || null,
          userName: authorName,
          userRole: authorRole || null,
          actionType,
          description,
          metadata: metadata || {}
        }
      });
    } catch (err) {
      console.error("[OSHistoryService] Erro ao gravar histórico da OS:", err);
    }
  }

  /**
   * Busca a lista cronológica de eventos de uma OS
   */
  async getOrderHistory(orderId: string) {
    return prisma.oSHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true
          }
        }
      }
    });
  }
}

export const osHistoryService = new OSHistoryService();
