import { Request, Response } from 'express';
import prisma from '../database/prisma';
import { OSConciliatorService } from '../services/OSConciliatorService';
import { MigrationRulesEngine, MigrationSuggestion } from '../domain/os/MigrationRulesEngine';
import { auditService } from '../services/AuditService';
import { eventBus } from '../events';
import { OSStatus } from '../types';

export class ConciliationController {
  
  /**
   * Simulates conciliation for all active work orders.
   */
  async simulate(req: Request, res: Response) {
    try {
      console.log('[ConciliationController] Starting simulation...');
      
      // Load historical physical data (cache-backed)
      const { caixaEntries, brunoPayments, physicalReadyOSs } = await OSConciliatorService.loadHistoricalData();
      
      // Fetch active work orders (not finalized and not already pago_pronto_retirada)
      // Including messageHistories relation for WhatsApp evaluation
      const activeOrders = await prisma.ordemServico.findMany({
        where: {
          deletedAt: null,
          status: {
            notIn: ['FINALIZADO', 'PAGO_PRONTO_RETIRADA']
          }
        },
        include: {
          client: true,
          device: true,
          messageHistories: true
        }
      });
      
      console.log(`[ConciliationController] Active orders fetched: ${activeOrders.length}`);
      
      const suggestions: MigrationSuggestion[] = [];
      
      for (const os of activeOrders) {
        const suggestion = await MigrationRulesEngine.evaluateOS(os, caixaEntries, brunoPayments, physicalReadyOSs);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
      
      const totalAnalyzed = activeOrders.length;
      const totalCompatible = suggestions.filter(s => s.classification === 'AUTOMATIC').length;
      const totalReview = suggestions.filter(s => s.classification === 'REVIEW').length;
      const totalConflicts = suggestions.filter(s => s.classification === 'CONFLICT').length;
      
      res.json({
        success: true,
        summary: {
          totalAnalyzed,
          totalCompatible,
          totalReview,
          totalConflicts,
          totalSuggestions: suggestions.length
        },
        suggestions
      });
    } catch (err: any) {
      console.error('[ConciliationController] Simulation failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Executes migration in batch for selected suggestions.
   */
  async execute(req: Request, res: Response) {
    const { suggestions, user } = req.body; // user name/email
    const createdBy = user || 'ADMIN_CONCILIATION';

    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      res.status(400).json({ success: false, error: 'Lista de sugestões para migração inválida ou vazia.' });
      return;
    }

    try {
      console.log(`[ConciliationController] Executing conciliation batch for ${suggestions.length} items...`);
      
      // Create Batch record
      const batch = await prisma.oSConciliationBatch.create({
        data: {
          createdBy
        }
      });

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const item of suggestions) {
        const { orderId, statusSugerido, forceSerialFix } = item;
        
        try {
          // Fetch order
          const os = await prisma.ordemServico.findUnique({
            where: { id: orderId }
          });

          if (!os) {
            errors.push(`OS com id ${orderId} não encontrada.`);
            errorCount++;
            continue;
          }

          const oldStatus = os.status as OSStatus;
          let usedParts = typeof os.usedParts === 'string' ? JSON.parse(os.usedParts) : (os.usedParts || []);
          let partsUpdated = false;

          // Apply auto-serial fix if requested and needed
          if (forceSerialFix) {
            const parts = await prisma.part.findMany();
            usedParts = usedParts.map((up: any) => {
              const partDef = parts.find((p: any) => p.id === up.partId);
              if (partDef && partDef.requiresSerial && (!up.serialNumber || up.serialNumber.trim() === '')) {
                partsUpdated = true;
                return {
                  ...up,
                  serialNumber: `MIG-AUTO-${os.osNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
                };
              }
              return up;
            });
          }

          // Update OS status and usedParts (if serial fixed)
          await prisma.ordemServico.update({
            where: { id: orderId },
            data: {
              status: statusSugerido,
              usedParts: partsUpdated ? usedParts : undefined
            }
          });

          // Log conciliation item with enhanced audit snapshot
          await prisma.oSConciliationItem.create({
            data: {
              batchId: batch.id,
              orderId,
              oldStatus,
              newStatus: statusSugerido,
              reason: item.motivo || 'Migração automática de conciliação',
              confidence: item.grauConfianca || 0,
              confidenceLevel: item.confidenceLevel || 'LOW',
              rulesSatisfied: item.regrasSatisfeitas ? item.regrasSatisfeitas.map((r: any) => r.rule) : [],
              sourceFiles: item.sourceFiles || [],
              metadata: {
                regrasSatisfeitasDetalhes: item.regrasSatisfeitas,
                divergencias: item.divergencias
              }
            }
          });

          // Log to central Audit Trail
          await auditService.log({
            entityName: 'OrdemServico',
            entityId: orderId,
            action: 'AUTO_CONCILIATION',
            oldValue: { status: oldStatus },
            newValue: { 
              status: statusSugerido, 
              serialsFixed: partsUpdated,
              batchId: batch.id,
              confidence: item.grauConfianca,
              confidenceLevel: item.confidenceLevel,
              rulesSatisfied: item.regrasSatisfeitas ? item.regrasSatisfeitas.map((r: any) => r.rule) : []
            },
            userId: createdBy,
            source: 'SYSTEM_CONCILIATION',
            reason: `OS concitada automaticamente em lote. Lote ID: ${batch.id}. Motivo: ${item.motivo}`
          });

          // Publish events to EventBus
          eventBus.emit("OS_CONCILIATED" as any, {
            orderId,
            oldStatus,
            newStatus: statusSugerido,
            batchId: batch.id,
            confidence: item.grauConfianca,
            rulesSatisfied: item.regrasSatisfeitas ? item.regrasSatisfeitas.map((r: any) => r.rule) : []
          });

          eventBus.emit("OS_STATUS_CHANGED" as any, {
            id: orderId,
            oldStatus,
            newStatus: statusSugerido,
            updatedBy: createdBy
          });

          successCount++;
        } catch (e: any) {
          console.error(`[ConciliationController] Error processing item ${orderId}:`, e);
          errors.push(`Erro na OS ID ${orderId}: ${e.message}`);
          errorCount++;
        }
      }

      res.json({
        success: true,
        batchId: batch.id,
        summary: {
          total: suggestions.length,
          success: successCount,
          errors: errorCount
        },
        errorDetails: errors
      });
    } catch (err: any) {
      console.error('[ConciliationController] Batch execution failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Lists all execution batches.
   */
  async getBatches(req: Request, res: Response) {
    try {
      const batches = await prisma.oSConciliationBatch.findMany({
        include: {
          items: {
            include: {
              order: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(batches.map(b => ({
        id: b.id,
        createdAt: b.createdAt.toISOString(),
        createdBy: b.createdBy,
        totalItems: b.items.length,
        undoneItems: b.items.filter(i => i.undoneAt !== null).length,
        items: b.items.map(i => ({
          id: i.id,
          orderId: i.orderId,
          osNumber: i.order.osNumber,
          oldStatus: i.oldStatus,
          newStatus: i.newStatus,
          reason: i.reason,
          confidence: i.confidence,
          confidenceLevel: i.confidenceLevel,
          rulesSatisfied: i.rulesSatisfied,
          sourceFiles: i.sourceFiles,
          undoneAt: i.undoneAt?.toISOString() || null
        }))
      })));
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Reverts (Rollback) a specific batch of conciliation.
   */
  async rollback(req: Request, res: Response) {
    const { batchId } = req.params;
    const { user } = req.body;
    const undoneBy = user || 'ADMIN_CONCILIATION';

    try {
      console.log(`[ConciliationController] Initiating rollback for batch ${batchId}...`);
      
      const batch = await prisma.oSConciliationBatch.findUnique({
        where: { id: batchId },
        include: { items: true }
      });

      if (!batch) {
        res.status(404).json({ success: false, error: `Lote de conciliação ${batchId} não encontrado.` });
        return;
      }

      let rollbackCount = 0;
      let skipCount = 0;

      for (const item of batch.items) {
        if (item.undoneAt !== null) {
          skipCount++;
          continue; // Already undone
        }

        try {
          // Restore old status
          await prisma.ordemServico.update({
            where: { id: item.orderId },
            data: {
              status: item.oldStatus
            }
          });

          // Mark item as undone
          await prisma.oSConciliationItem.update({
            where: { id: item.id },
            data: {
              undoneAt: new Date()
            }
          });

          // Log Audit Log
          await auditService.log({
            entityName: 'OrdemServico',
            entityId: item.orderId,
            action: 'ROLLBACK_CONCILIATE',
            oldValue: { status: item.newStatus },
            newValue: { status: item.oldStatus },
            userId: undoneBy,
            source: 'SYSTEM_CONCILIATION',
            reason: `Reversão automática da conciliação do Lote ID: ${batchId}`
          });

          // Publish events to EventBus
          eventBus.emit("OS_CONCILIATION_ROLLEDBACK" as any, {
            orderId: item.orderId,
            restoredStatus: item.oldStatus,
            batchId
          });

          eventBus.emit("OS_STATUS_CHANGED" as any, {
            id: item.orderId,
            oldStatus: item.newStatus,
            newStatus: item.oldStatus,
            updatedBy: undoneBy
          });

          rollbackCount++;
        } catch (e) {
          console.error(`[ConciliationController] Failed to rollback OS ${item.orderId}:`, e);
        }
      }

      res.json({
        success: true,
        batchId,
        summary: {
          total: batch.items.length,
          restored: rollbackCount,
          skipped: skipCount
        }
      });
    } catch (err: any) {
      console.error('[ConciliationController] Rollback failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Scans all OSs in AGUARDANDO_AVALIACAO that already have diagnostic/costs
   * and provides a quality indicators summary.
   */
  async scanAvaliacao(req: Request, res: Response) {
    try {
      const { getActiveAvaliacaoConfig } = await import('../config/conciliation.config');
      const config = await getActiveAvaliacaoConfig();

      const activeOrders = await prisma.ordemServico.findMany({
        where: {
          deletedAt: null,
          status: 'AGUARDANDO_AVALIACAO'
        },
        include: {
          client: true,
          device: true,
          messageHistories: true
        }
      });

      const suggestions = [];
      let totalValueInOpen = 0;
      let totalDaysInAvaliacao = 0;

      for (const os of activeOrders) {
        const suggestion = MigrationRulesEngine.evaluateAvaliacao(os, config);
        if (suggestion) {
          suggestions.push(suggestion);
          totalValueInOpen += suggestion.totalCost;

          const dataCriacao = new Date(os.createdAt);
          const diffMs = Date.now() - dataCriacao.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          totalDaysInAvaliacao += diffDays;
        }
      }

      const totalAnalisadas = activeOrders.length;
      const totalSugeridas = suggestions.length;
      const totalConfAlta = suggestions.filter(s => s.confidenceLevel === 'HIGH').length;
      const totalConfMedia = suggestions.filter(s => s.confidenceLevel === 'MEDIUM').length;

      const percentualDistorcido = totalAnalisadas > 0
        ? ((totalSugeridas / totalAnalisadas) * 100).toFixed(1) + '%'
        : '0%';

      const mediaDiasEmAvaliacao = totalSugeridas > 0
        ? Number((totalDaysInAvaliacao / totalSugeridas).toFixed(1))
        : 0;

      res.json({
        success: true,
        summary: {
          totalAnalisadas,
          totalSugeridas,
          totalConfAlta,
          totalConfMedia,
          valorTotalEmAberto: `R$ ${totalValueInOpen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          percentualDistorcido,
          mediaDiasEmAvaliacao
        },
        suggestions: suggestions.sort((a, b) => b.scoreConfianca - a.scoreConfianca)
      });
    } catch (err: any) {
      console.error('[ConciliationController] Scan Avaliacao failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Applies the status update from AGUARDANDO_AVALIACAO to AGUARDANDO_AUTORIZACAO
   * with optional WhatsApp triggers, recording the batch and auditing items.
   */
  async applyAvaliacao(req: Request, res: Response) {
    const { suggestions, dispararWhatsApp, user } = req.body;
    const createdBy = user || 'ADMIN_STATUS_CONCILIATION';

    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      res.status(400).json({ success: false, error: 'Lista de OSs inválida ou vazia.' });
      return;
    }

    try {
      const batch = await prisma.oSConciliationBatch.create({
        data: {
          createdBy
        }
      });

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const item of suggestions) {
        const { orderId, scoreConfianca, confidenceLevel, motivoResumo } = item;

        try {
          const os = await prisma.ordemServico.findUnique({
            where: { id: orderId },
            include: { client: true, device: true }
          });

          if (!os) {
            errors.push(`OS com id ${orderId} não encontrada.`);
            errorCount++;
            continue;
          }

          const oldStatus = os.status as OSStatus;

          // Update Status
          await prisma.ordemServico.update({
            where: { id: orderId },
            data: {
              status: 'AGUARDANDO_AUTORIZACAO'
            }
          });

          // Log conciliation item
          await prisma.oSConciliationItem.create({
            data: {
              batchId: batch.id,
              orderId,
              oldStatus,
              newStatus: 'AGUARDANDO_AUTORIZACAO',
              reason: `[SANEAMENTO_STATUS] Score: ${scoreConfianca}/100. Evidências: ${motivoResumo}`,
              confidence: scoreConfianca,
              confidenceLevel,
              rulesSatisfied: item.regrasSatisfeitas?.map((r: any) => r.rule) || [],
              sourceFiles: []
            }
          });

          // Audit Log
          await auditService.log({
            entityName: 'OrdemServico',
            entityId: orderId,
            action: 'UPDATE_STATUS_CONCILIATE',
            oldValue: { status: oldStatus },
            newValue: { status: 'AGUARDANDO_AUTORIZACAO' },
            userId: createdBy,
            source: 'SYSTEM_CONCILIATION',
            reason: `Saneamento operacional de status: ${motivoResumo}`
          });

          // Dispatch Event to EventBus
          eventBus.emit("OS_STATUS_CHANGED" as any, {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            aggregateId: orderId,
            aggregateType: "OrdemServico",
            actor: createdBy,
            payload: { previousStatus: oldStatus, newStatus: 'AGUARDANDO_AUTORIZACAO' },
            version: 1
          });

          // Optional WhatsApp Notification
          if (dispararWhatsApp) {
            const { triggerWhatsAppNotification } = await import('../services/whatsapp');
            await triggerWhatsAppNotification(orderId, 'AGUARDANDO_AUTORIZACAO');
          }

          successCount++;
        } catch (e: any) {
          console.error(`[ConciliationController] Failed to process status conciliation for ${orderId}:`, e);
          errors.push(`Falha na OS ${orderId}: ${e.message}`);
          errorCount++;
        }
      }

      res.json({
        success: true,
        batchId: batch.id,
        summary: {
          total: suggestions.length,
          success: successCount,
          errors: errorCount
        },
        errors
      });
    } catch (err: any) {
      console.error('[ConciliationController] Apply Status Conciliation failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
