import prisma from "../database/prisma";
import { eventBus, Events } from "../events";
import { StandardEvent } from "../events/types";

/**
 * AuditService — Trilha de Auditoria centralizada orientada a eventos.
 */

interface AuditEntry {
  entityName: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  userId: string;
  ipAddress?: string;
  source?: string;
  reason?: string;
}

class AuditService {
  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    eventBus.on(Events.CLIENT_CREATED, this.handleClientCreated.bind(this));
    eventBus.on(Events.CLIENT_UPDATED, this.handleClientUpdated.bind(this));
    // Outros listeners de auditoria...
  }

  private async handleClientCreated(event: StandardEvent) {
    await this.log({
      entityName: event.aggregateType,
      entityId: event.aggregateId,
      action: "CLIENT_CREATED",
      newValue: event.payload,
      userId: event.actor,
      source: "backend",
      reason: "Criação de novo cliente via API"
    });
  }

  private async handleClientUpdated(event: StandardEvent) {
    const { before, after } = event.payload;
    
    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        oldValue[key] = before[key];
        newValue[key] = after[key];
      }
    }

    // Só registra se houve mudança real
    if (Object.keys(newValue).length === 0) return;

    await this.log({
      entityName: event.aggregateType,
      entityId: event.aggregateId,
      action: "CLIENT_UPDATED",
      oldValue,
      newValue,
      userId: event.actor,
      source: "backend",
      reason: "Atualização de dados do cliente via API"
    });
  }
  /**
   * Registra um evento de auditoria no banco de dados.
   * Execução assíncrona — nunca bloqueia o fluxo principal.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          entityName: entry.entityName,
          entityId: entry.entityId,
          action: entry.action,
          oldValue: entry.oldValue ?? undefined,
          newValue: entry.newValue ?? undefined,
          userId: entry.userId,
          ipAddress: entry.ipAddress,
          source: entry.source,
          reason: entry.reason
        }
      });
    } catch (err) {
      // Auditoria nunca deve derrubar o sistema — log silencioso
      console.error("[AuditService] Falha ao registrar auditoria:", err);
    }
  }

  /**
   * Registra alteração comparando valores antigos e novos automaticamente.
   * Filtra apenas os campos que realmente mudaram.
   */
  async logDiff(
    entityName: string,
    entityId: string,
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    userId: string
  ): Promise<void> {
    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    for (const key of Object.keys(newObj)) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        oldValue[key] = oldObj[key];
        newValue[key] = newObj[key];
      }
    }

    // Só registra se houve mudança real
    if (Object.keys(newValue).length === 0) return;

    await this.log({
      entityName,
      entityId,
      action: "UPDATE",
      oldValue,
      newValue,
      userId,
    });
  }
}

export const auditService = new AuditService();
