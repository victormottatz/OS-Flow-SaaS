import { Request, Response } from "express";
import prisma from "../database/prisma";
import { OSStatus } from "../types";

export class DashboardController {
  async getExecutiveMetrics(req: Request, res: Response) {
    try {
      // Definimos o período (padrão: mês atual, mas poderia receber via query param)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const orders = await prisma.ordemServico.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth }
        }
      });

      let revenue = 0;
      let partsCost = 0;
      let laborRevenue = 0;
      let finalizedCount = 0;

      orders.forEach((os: any) => {
        if (os.status === "FINALIZADO" || os.status === "PRONTO_RETIRADA") {
          finalizedCount++;
          revenue += os.totalCost || 0;
          laborRevenue += os.laborCost || 0;

          const usedParts = typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts || [];
          usedParts.forEach((up: any) => {
            // Se o costSnapshot não foi gravado na época, tenta usar uma aproximação.
            // Para maior precisão, costSnapshot já está sendo gravado nas novas OS (Sprint 4).
            const unitCost = up.costSnapshot !== undefined ? up.costSnapshot : (up.price * 0.5); // Fallback: 50% de margem
            partsCost += unitCost * up.quantity;
          });
        }
      });

      const profit = revenue - partsCost;
      const averageTicket = finalizedCount > 0 ? revenue / finalizedCount : 0;

      res.json({
        period: "Current Month",
        totalOS: orders.length,
        finalizedOS: finalizedCount,
        revenue,
        partsCost,
        profit,
        averageTicket,
        laborRevenue
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getOperationalMetrics(req: Request, res: Response) {
    try {
      const activeOS = await prisma.ordemServico.findMany({
        where: { deletedAt: null }
      });

      const statusCount: Record<string, number> = {
        AGUARDANDO_AVALIACAO: 0,
        AGUARDANDO_AUTORIZACAO: 0,
        AGUARDANDO_PECA: 0,
        EM_MANUTENCAO: 0,
        PRONTO_RETIRADA: 0,
        PAGO_PRONTO_RETIRADA: 0,
        FINALIZADO: 0
      };

      activeOS.forEach((os: any) => {
        if (statusCount[os.status] !== undefined) {
          statusCount[os.status]++;
        }
      });

      // Peças com estoque baixo
      const lowStockParts = await prisma.part.findMany({
        where: {
          deletedAt: null,
          stock: { lt: prisma.part.fields.stockMin }
        },
        select: { id: true, name: true, stock: true, stockMin: true }
      });

      // Calcular TMA (Tempo Médio de Atendimento)
      const finalizedOS = activeOS.filter((os: any) => os.status === "FINALIZADO");
      let totalTmaDays = 0;
      let validTmaCount = 0;
      finalizedOS.forEach((os: any) => {
        const start = os.createdAt;
        const end = os.originalExitDate;
        if (end) {
          const diff = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          totalTmaDays += diff;
          validTmaCount++;
        } else {
          totalTmaDays += 2.5; // fallback
          validTmaCount++;
        }
      });
      const dbTma = validTmaCount > 0 ? (totalTmaDays / validTmaCount) : 0;

      // Calcular SLA Crítico (OS ativas com mais de 15 dias)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const slaCriticalCount = activeOS.filter((os: any) => os.status !== "FINALIZADO" && new Date(os.createdAt) < fifteenDaysAgo).length;

      // Calcular contagem de mensagens do WhatsApp
      const messages = await prisma.messageHistory.findMany({
        select: { status: true }
      });
      let whatsappSent = 0;
      let whatsappFailed = 0;
      messages.forEach((m: any) => {
        if (m.status === "ENVIADO" || m.status === "ENTREGUE" || m.status === "LIDO") {
          whatsappSent++;
        } else if (m.status === "FALHOU") {
          whatsappFailed++;
        }
      });

      // Total de clientes geral no sistema
      const totalClientsCount = await prisma.client.count({
        where: { deletedAt: null }
      });

      // Total de OS finalizadas com faturamento pendente
      const pendingBillingCount = await prisma.ordemServico.count({
        where: {
          deletedAt: null,
          status: "FINALIZADO",
          billingStatus: "PENDENTE"
        }
      });

      res.json({
        kanbanDistribution: statusCount,
        totalActiveOS: activeOS.length - statusCount.FINALIZADO,
        criticalStockParts: lowStockParts,
        tmaDays: Number(dbTma.toFixed(1)),
        slaCriticalCount,
        whatsappSummary: {
          sent: whatsappSent,
          failed: whatsappFailed
        },
        totalClientsCount,
        pendingBillingCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const dashboardController = new DashboardController();
