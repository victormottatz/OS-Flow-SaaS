import { OSStatus } from '../../types';
import { CaixaEntry, BrunoPayment, PhysicalReadyOS } from '../../services/OSConciliatorService';
import { OSPolicies } from './os.policies';
import { CONCILIATION_CONFIG, getActiveConciliationConfig } from '../../config/conciliation.config';
import prisma from '../../database/prisma';

export interface RuleSatisfied {
  rule: string;
  points: number;
  evidence: string;
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConciliationClassification = 'AUTOMATIC' | 'REVIEW' | 'CONFLICT' | 'NONE';

export interface MigrationSuggestion {
  orderId: string;
  osNumber: string;
  clienteName: string;
  equipamentoName: string;
  statusAtual: OSStatus;
  statusSugerido: OSStatus;
  grauConfianca: number; // 0 a 100
  confidenceLevel: ConfidenceLevel;
  classification: ConciliationClassification;
  motivo: string;
  divergencias: string[];
  regrasSatisfeitas: RuleSatisfied[];
  requiresSerialFix: boolean;
  missingSerials: string[];
  valorBanco: number;
  valorCaixa?: number;
  valorRepasse?: number;
  sourceFiles: string[];
}

function parseDateBRL(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseBrunoRefMonth(refMonth: string): Date | null {
  if (!refMonth) return null;
  const parts = refMonth.split('/');
  if (parts.length === 2) {
    const month = parseInt(parts[0], 10) - 1;
    const year = parseInt(parts[1], 10);
    const d = new Date(year, month, 15); // Dia 15 do mês de referência
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function isValidNameMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  
  const cleanA = nameA.toLowerCase().trim();
  const cleanB = nameB.toLowerCase().trim();
  
  if (cleanA === cleanB) return true;
  
  const ignoreWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  
  const wordsA = cleanA.split(/[\s.-]+/).filter(w => w.length > 1 && !ignoreWords.has(w));
  const wordsB = cleanB.split(/[\s.-]+/).filter(w => w.length > 1 && !ignoreWords.has(w));
  
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  
  if (wordsA.length === 1 || wordsB.length === 1) {
    return wordsA.length === 1 && wordsB.length === 1 && wordsA[0] === wordsB[0];
  }
  
  let sharedCount = 0;
  for (const wA of wordsA) {
    if (wordsB.includes(wA)) {
      sharedCount++;
    }
  }
  
  return sharedCount >= 2;
}

export class MigrationRulesEngine {
  /**
   * Evaluates a single Work Order against historical data, physical checklist,
   * chronologies, and multiple OS/devices history.
   */
  static async evaluateOS(
    os: any,
    caixaEntries: CaixaEntry[],
    brunoPayments: BrunoPayment[],
    physicalReadyOSs: PhysicalReadyOS[] = []
  ): Promise<MigrationSuggestion | null> {
    // If it's already FINALIZADO, it doesn't need to be reconciled
    if (os.status === 'FINALIZADO') {
      return null;
    }

    const config = await getActiveConciliationConfig();
    const CONCILIATION_CONFIG = config;

    const clientName = os.client?.name || '';
    const deviceName = os.device ? `${os.device.brand} ${os.device.model}` : '';
    const osNumberClean = os.osNumber.replace('OS-', '').trim();
    const osNumberFull = os.osNumber;
    const valorBanco = os.totalCost || 0;

    let matchedCaixa: CaixaEntry | null = null;
    let matchedPayment: BrunoPayment | null = null;
    const divergencias: string[] = [];
    const regrasSatisfeitas: RuleSatisfied[] = [];
    const sourceFiles = new Set<string>();

    let totalScore = 0;
    let hasOSNumberMatch = false;
    let hasNameOnlyMatch = false;

    // 1. PAYMENT RULE: Search in Caixa Entries (PDF)
    let caixaMatch = caixaEntries.find(entry => entry.os === osNumberClean);
    if (caixaMatch) {
      matchedCaixa = caixaMatch;
      hasOSNumberMatch = true;
      sourceFiles.add(caixaMatch.fileName);
    } else if (clientName) {
      caixaMatch = caixaEntries.find(entry => {
        if (!isValidNameMatch(entry.cliente, clientName)) return false;

        const valDiff = Math.abs(entry.valor - valorBanco);
        if (valDiff >= CONCILIATION_CONFIG.VALUE_TOLERANCE_BRL) return false;

        const dataOS = os.originalEntryDate ? new Date(os.originalEntryDate) : new Date(os.createdAt);
        const dataPagamento = parseDateBRL(entry.date);
        if (dataOS && dataPagamento) {
          const diffMs = dataPagamento.getTime() - dataOS.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays < -2 || diffDays > 60) {
            return false;
          }
        }

        return true;
      });
      if (caixaMatch) {
        matchedCaixa = caixaMatch;
        hasNameOnlyMatch = true;
        sourceFiles.add(caixaMatch.fileName);
      }
    }

    // 2. PAYMENT RULE: Search in Bruno's Payments (XLSX)
    if (clientName) {
      matchedPayment = brunoPayments.find(p => {
        if (!isValidNameMatch(p.cliente, clientName)) return false;

        const valDiff = Math.abs(p.valor - valorBanco);
        if (valDiff >= CONCILIATION_CONFIG.VALUE_TOLERANCE_BRL) return false;

        const dataOS = os.originalEntryDate ? new Date(os.originalEntryDate) : new Date(os.createdAt);
        const dataPagamento = parseBrunoRefMonth(p.refMonth);
        if (dataOS && dataPagamento) {
          const diffMs = dataPagamento.getTime() - dataOS.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays < -15 || diffDays > 90) {
            return false;
          }
        }

        return true;
      });

      if (matchedPayment) {
        sourceFiles.add(matchedPayment.fileName);
        if (!hasOSNumberMatch) {
          hasNameOnlyMatch = true;
        }
      }
    }

    // If no payment was found at all, we don't suggest conciliation (no evidence of transaction)
    if (!matchedCaixa && !matchedPayment) {
      return null;
    }

    // Apply Payment Scores
    if (hasOSNumberMatch) {
      totalScore += CONCILIATION_CONFIG.OS_NUMBER_MATCH_SCORE;
      regrasSatisfeitas.push({
        rule: 'OS_NUMBER_FOUND',
        points: CONCILIATION_CONFIG.OS_NUMBER_MATCH_SCORE,
        evidence: `Número exato da OS (${osNumberClean}) localizado nos registros de pagamento`
      });
    } else if (hasNameOnlyMatch) {
      totalScore += CONCILIATION_CONFIG.OS_NUMBER_MATCH_SCORE;
      regrasSatisfeitas.push({
        rule: 'PAYMENT_FOUND_BY_NAME',
        points: CONCILIATION_CONFIG.OS_NUMBER_MATCH_SCORE,
        evidence: `Pagamento localizado provisoriamente por compatibilidade de nome do cliente`
      });

      totalScore -= CONCILIATION_CONFIG.NAME_ONLY_MATCH_PENALTY;
      regrasSatisfeitas.push({
        rule: 'NAME_ONLY_MATCH_PENALTY',
        points: -CONCILIATION_CONFIG.NAME_ONLY_MATCH_PENALTY,
        evidence: `Dedução por associação baseada apenas em nome, sem OS explícita`
      });
      divergencias.push(`Associação fraca: Pagamento localizado apenas pelo nome do cliente. Exige verificação.`);
    }

    // Value Check (Integral vs Partial)
    let valorPagoComprovado = 0;
    if (matchedCaixa) {
      valorPagoComprovado = Math.max(valorPagoComprovado, matchedCaixa.valor);
    }
    if (matchedPayment) {
      valorPagoComprovado = Math.max(valorPagoComprovado, matchedPayment.valor);
    }

    const isPagoIntegral = valorPagoComprovado >= valorBanco - 0.01;
    if (isPagoIntegral) {
      totalScore += CONCILIATION_CONFIG.PAYMENT_INTEGRAL_SCORE;
      regrasSatisfeitas.push({
        rule: 'PAYMENT_INTEGRAL',
        points: CONCILIATION_CONFIG.PAYMENT_INTEGRAL_SCORE,
        evidence: `Comprovado pagamento integral do valor da OS (R$ ${valorPagoComprovado.toFixed(2)} >= R$ ${valorBanco.toFixed(2)})`
      });
    } else {
      regrasSatisfeitas.push({
        rule: 'PAYMENT_PARTIAL',
        points: 0,
        evidence: `Pagamento parcial ou pendente detectado (Pago comprovado: R$ ${valorPagoComprovado.toFixed(2)} vs OS: R$ ${valorBanco.toFixed(2)})`
      });
      divergencias.push(`Divergência financeira: Pagamento comprovado de R$ ${valorPagoComprovado.toFixed(2)} menor que o total da OS de R$ ${valorBanco.toFixed(2)}.`);
    }

    if (matchedCaixa && Math.abs(matchedCaixa.valor - valorBanco) > 0.01) {
      divergencias.push(`Divergência de Valor: Caixa registra R$ ${matchedCaixa.valor.toFixed(2)}, mas banco registra R$ ${valorBanco.toFixed(2)}.`);
    }

    // 3. PHYSICAL PRESENCE (Sovereign rule)
    const matchedPhysical = physicalReadyOSs.find(p => p.osNumberClean === osNumberClean);
    const existsPhysically = !!matchedPhysical;

    if (existsPhysically) {
      totalScore += CONCILIATION_CONFIG.PHYSICAL_PRESENT_SCORE;
      regrasSatisfeitas.push({
        rule: 'PHYSICAL_PRESENT',
        points: CONCILIATION_CONFIG.PHYSICAL_PRESENT_SCORE,
        evidence: `Equipamento localizado fisicamente pronto para retirada na oficina`
      });
    } else {
      regrasSatisfeitas.push({
        rule: 'PHYSICAL_ABSENT',
        points: 0,
        evidence: `Equipamento não consta na planilha física de prontos na oficina (aparelho já retirado)`
      });
    }

    // 4. CHRONOLOGY CORRELATION (Timeline analysis)
    const dataOS = os.originalEntryDate ? new Date(os.originalEntryDate) : new Date(os.createdAt);
    let dataPagamento: Date | null = null;
    if (matchedCaixa) {
      dataPagamento = parseDateBRL(matchedCaixa.date);
    } else if (matchedPayment) {
      dataPagamento = parseBrunoRefMonth(matchedPayment.refMonth);
    }

    let hasTemporalConflict = false;
    if (dataOS && dataPagamento) {
      const diffMs = dataPagamento.getTime() - dataOS.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (dataPagamento.getTime() < dataOS.getTime() - (1000 * 60 * 60 * 24 * 2)) {
        // Payment made BEFORE OS opening (Severe Conflict)
        hasTemporalConflict = true;
        totalScore -= CONCILIATION_CONFIG.TEMPORAL_CONFLICT_PENALTY;
        regrasSatisfeitas.push({
          rule: 'TEMPORAL_CONFLICT',
          points: -CONCILIATION_CONFIG.TEMPORAL_CONFLICT_PENALTY,
          evidence: `Conflito temporal: Pagamento em ${dataPagamento.toLocaleDateString()} é anterior à abertura da OS em ${dataOS.toLocaleDateString()}`
        });
        divergencias.push(`Conflito Temporal: Pagamento realizado antes da abertura da OS.`);
      } else {
        const absDiffDays = Math.abs(diffDays);
        if (absDiffDays <= 15) {
          totalScore += CONCILIATION_CONFIG.TEMPORAL_MATCH_HIGH_SCORE;
          regrasSatisfeitas.push({
            rule: 'TEMPORAL_MATCH_HIGH',
            points: CONCILIATION_CONFIG.TEMPORAL_MATCH_HIGH_SCORE,
            evidence: `Alta correlação temporal: pagamento realizado em até 15 dias da OS (${Math.round(absDiffDays)} dias)`
          });
        } else if (absDiffDays <= 90) {
          totalScore += CONCILIATION_CONFIG.TEMPORAL_MATCH_MEDIUM_SCORE;
          regrasSatisfeitas.push({
            rule: 'TEMPORAL_MATCH_MEDIUM',
            points: CONCILIATION_CONFIG.TEMPORAL_MATCH_MEDIUM_SCORE,
            evidence: `Média correlação temporal: pagamento realizado entre 16 e 90 dias da OS (${Math.round(absDiffDays)} dias)`
          });
        } else {
          regrasSatisfeitas.push({
            rule: 'TEMPORAL_MATCH_LOW',
            points: 0,
            evidence: `Baixa correlação temporal: pagamento realizado a mais de 90 dias da OS (${Math.round(absDiffDays)} dias)`
          });
          if (absDiffDays > 180 && hasNameOnlyMatch) {
            totalScore -= CONCILIATION_CONFIG.NAME_ONLY_MATCH_PENALTY;
            regrasSatisfeitas.push({
              rule: 'TEMPORAL_OUT_OF_RANGE_PENALTY',
              points: -CONCILIATION_CONFIG.NAME_ONLY_MATCH_PENALTY,
              evidence: `Dedução por pagamento muito distante temporalmente e sem OS exata`
            });
            divergencias.push(`Alerta temporal: Pagamento com mais de 180 dias de diferença.`);
          }
        }
      }
    }

    // 5. DATABASE AUDIT: Active OSs count for client
    const activeOSCount = await prisma.ordemServico.count({
      where: {
        clientId: os.clientId,
        deletedAt: null,
        status: {
          notIn: ['FINALIZADO', 'PAGO_PRONTO_RETIRADA']
        }
      }
    });

    if (activeOSCount > 1) {
      totalScore -= CONCILIATION_CONFIG.MULTIPLE_OS_PENALTY;
      regrasSatisfeitas.push({
        rule: 'MULTIPLE_OS_PENALTY',
        points: -CONCILIATION_CONFIG.MULTIPLE_OS_PENALTY,
        evidence: `Dedução por múltiplas OSs ativas do mesmo cliente simultaneamente`
      });
      divergencias.push(`Ambiguidade de Cliente: Possui ${activeOSCount} OSs ativas. Risco de faturamento incorreto.`);
    }

    // 6. DATABASE AUDIT: History OSs count for the device
    const totalEquipmentOSCount = await prisma.ordemServico.count({
      where: {
        deviceId: os.deviceId,
        deletedAt: null
      }
    });

    let hasMultipleHistory = false;
    if (totalEquipmentOSCount > 1 && !hasOSNumberMatch) {
      hasMultipleHistory = true;
      totalScore -= CONCILIATION_CONFIG.NAME_ONLY_MATCH_PENALTY;
      regrasSatisfeitas.push({
        rule: 'MULTIPLE_HISTORY_FOR_EQUIPMENT',
        points: -CONCILIATION_CONFIG.NAME_ONLY_MATCH_PENALTY,
        evidence: `Dedução: Equipamento possui histórico de ${totalEquipmentOSCount} OSs no banco. Associação apenas por nome exige revisão`
      });
      divergencias.push(`Histórico Múltiplo: Equipamento possui histórico de várias OSs. Risco de vincular pagamento de OS antiga.`);
    }

    // 7. INACTIVITY FACTOR
    const entryDate = os.originalEntryDate || os.createdAt;
    let diffMonths = 0;
    if (entryDate) {
      const diffMs = Date.now() - new Date(entryDate).getTime();
      diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.4375);
    }

    // 8. QUALITY FACTORS (laudo, fotos, whatsapp, peças)
    if (os.diagnostic && os.diagnostic.trim().length > 0) {
      totalScore += 5; // DIAGNOSTIC_SCORE
      regrasSatisfeitas.push({
        rule: 'DIAGNOSTIC_AVAILABLE',
        points: 5,
        evidence: `Laudo Técnico preenchido`
      });
    }

    const usedParts = typeof os.usedParts === 'string' ? JSON.parse(os.usedParts) : (os.usedParts || []);
    if (usedParts.length > 0) {
      totalScore += 5; // USED_PARTS_SCORE
      regrasSatisfeitas.push({
        rule: 'USED_PARTS_LOGGED',
        points: 5,
        evidence: `${usedParts.length} peça(s) associada(s) à OS`
      });
    }

    const photos = typeof os.laudoFotos === 'string' ? JSON.parse(os.laudoFotos) : (os.laudoFotos || []);
    if (photos.length > 0) {
      totalScore += 5; // PHOTOS_SCORE
      regrasSatisfeitas.push({
        rule: 'PHOTOS_ATTACHED',
        points: 5,
        evidence: `${photos.length} foto(s) anexada(s) no laudo`
      });
    }

    const whatsappMessages = os.messageHistories || [];
    if (whatsappMessages.length > 0) {
      totalScore += 5; // WHATSAPP_SCORE
      regrasSatisfeitas.push({
        rule: 'WHATSAPP_MESSAGES_SENT',
        points: 5,
        evidence: `${whatsappMessages.length} mensagem(ns) de WhatsApp registrada(s) no histórico`
      });
    }

    // Ensure score range [0, 100]
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // Confidence Level Mapping
    let confidenceLevel: ConfidenceLevel = 'LOW';
    if (finalScore >= CONCILIATION_CONFIG.CONFIDENCE_HIGH) {
      confidenceLevel = 'HIGH';
    } else if (finalScore >= CONCILIATION_CONFIG.CONFIDENCE_MEDIUM) {
      confidenceLevel = 'MEDIUM';
    }

    // Evaluate serialization policies
    const serialCheck = await OSPolicies.canFinishOS(usedParts);
    let requiresSerialFix = false;
    let missingSerials: string[] = [];

    if (!serialCheck.allowed && serialCheck.missingSerials) {
      requiresSerialFix = true;
      missingSerials = serialCheck.missingSerials;
      divergencias.push(`Bloqueio de Serialização: As seguintes peças usadas exigem nº de série: ${missingSerials.join(', ')}.`);
    }

    // Determine Suggested Status
    let statusSugerido: OSStatus = os.status as OSStatus;
    if (existsPhysically) {
      // Equipment is in the shop
      statusSugerido = isPagoIntegral ? 'PAGO_PRONTO_RETIRADA' : 'PRONTO_RETIRADA';
    } else {
      // Equipment is NOT in the shop (already taken)
      const currentStatus = os.status as OSStatus;
      const isTechnicalInProgress = ['AGUARDANDO_AVALIACAO', 'AGUARDANDO_AUTORIZACAO', 'AGUARDANDO_PECA', 'EM_MANUTENCAO'].includes(currentStatus);

      if (isTechnicalInProgress && diffMonths < CONCILIATION_CONFIG.INACTIVITY_MONTHS) {
        // Still in active technical progress, expected to be absent in ready list
        return null;
      }
      statusSugerido = 'FINALIZADO';
    }

    // Determine Classification Group
    let classification: ConciliationClassification = 'NONE';
    const hasValueConflict = matchedCaixa && Math.abs(matchedCaixa.valor - valorBanco) >= CONCILIATION_CONFIG.VALUE_TOLERANCE_BRL;

    if (hasValueConflict || hasTemporalConflict) {
      classification = 'CONFLICT';
    } else if (finalScore >= CONCILIATION_CONFIG.CONFIDENCE_HIGH) {
      // High score, but force Review if any manual checking indicators are active
      if (requiresSerialFix || hasMultipleHistory || activeOSCount > 1 || statusSugerido === 'PRONTO_RETIRADA') {
        classification = 'REVIEW';
      } else {
        classification = 'AUTOMATIC';
      }
    } else if (finalScore >= CONCILIATION_CONFIG.CONFIDENCE_MEDIUM) {
      classification = 'REVIEW';
    } else {
      classification = 'NONE';
    }

    if (finalScore < 30 && (classification === 'NONE' || classification === 'CONFLICT')) {
      return null;
    }

    const reasons = regrasSatisfeitas.map(r => `${r.evidence} (${r.points >= 0 ? '+' : ''}${r.points} pts)`);
    const motivo = reasons.join(' E ');

    return {
      orderId: os.id,
      osNumber: osNumberFull,
      clienteName: clientName,
      equipamentoName: deviceName,
      statusAtual: os.status as OSStatus,
      statusSugerido,
      grauConfianca: finalScore,
      confidenceLevel,
      classification,
      motivo,
      divergencias,
      regrasSatisfeitas,
      requiresSerialFix,
      missingSerials,
      valorBanco,
      valorCaixa: matchedCaixa?.valor,
      valorRepasse: matchedPayment?.valor,
      sourceFiles: Array.from(sourceFiles)
    };
  }

  /**
   * Avalia se uma OS em AGUARDANDO_AVALIACAO já possui evidências suficientes
   * de que um orçamento foi elaborado e deve ser sugerida para AGUARDANDO_AUTORIZACAO.
   */
  static evaluateAvaliacao(os: any, config: any): AvaliacaoSuggestion | null {
    // Apenas OSs em AGUARDANDO_AVALIACAO podem ser recomendadas
    if (os.status !== 'AGUARDANDO_AVALIACAO') {
      return null;
    }

    const clientName = os.client?.name || '';
    const deviceName = os.device ? `${os.device.brand} ${os.device.model}` : '';
    const valorTotal = os.totalCost || 0;
    const valorMaoDeObra = os.laborCost || 0;
    const usedParts = typeof os.usedParts === 'string' ? JSON.parse(os.usedParts) : (os.usedParts || []);
    const partsCount = usedParts.length;

    // Veto absoluto: se o valor total e o valor de mão de obra forem zerados, não há orçamento calculado
    if (valorTotal === 0 && valorMaoDeObra === 0) {
      return null;
    }

    const regrasSatisfeitas: RuleSatisfied[] = [];
    let totalScore = 0;

    // 1. totalCost > 0
    if (valorTotal > 0) {
      totalScore += config.ORCAMENTO_SCORE;
      regrasSatisfeitas.push({
        rule: 'ORCAMENTO_CALCULADO',
        points: config.ORCAMENTO_SCORE,
        evidence: `Orçamento calculado no valor de R$ ${valorTotal.toFixed(2)}`
      });
    }

    // 2. laborCost > 0
    if (valorMaoDeObra > 0) {
      totalScore += config.LABOR_SCORE;
      regrasSatisfeitas.push({
        rule: 'MAO_DE_OBRA_INFORMADA',
        points: config.LABOR_SCORE,
        evidence: `Custo de mão de obra de R$ ${valorMaoDeObra.toFixed(2)}`
      });
    }

    // 3. usedParts.length > 0
    if (partsCount > 0) {
      totalScore += config.PARTS_SCORE;
      regrasSatisfeitas.push({
        rule: 'PECAS_VINCULADAS',
        points: config.PARTS_SCORE,
        evidence: `${partsCount} peça(s) vinculada(s) ao orçamento`
      });
    }

    // 4. diagnostic preenchido
    if (os.diagnostic && os.diagnostic.trim().length > 0) {
      totalScore += config.DIAGNOSTIC_SCORE;
      regrasSatisfeitas.push({
        rule: 'LAUDO_TECNICO_PREENCHIDO',
        points: config.DIAGNOSTIC_SCORE,
        evidence: 'Laudo técnico preenchido no sistema'
      });
    }

    // 5. Histórico de WhatsApp enviado
    const whatsappMessages = os.messageHistories || [];
    const whatsappEnviado = whatsappMessages.some((m: any) => m.status === 'ENVIADO');
    if (whatsappEnviado) {
      totalScore += config.WHATSAPP_SCORE;
      regrasSatisfeitas.push({
        rule: 'WHATSAPP_ENVIADO',
        points: config.WHATSAPP_SCORE,
        evidence: 'Notificações de WhatsApp registradas como enviadas'
      });
    }

    // 6. laudoMacro preenchido
    if (os.laudoMacro && os.laudoMacro.trim().length > 0) {
      totalScore += config.LAUDO_MACRO_SCORE;
      regrasSatisfeitas.push({
        rule: 'LAUDO_MACRO_PREENCHIDO',
        points: config.LAUDO_MACRO_SCORE,
        evidence: 'Resumo público do laudo macro preenchido'
      });
    }

    // 7. laudoFotos.length > 0
    const photos = typeof os.laudoFotos === 'string' ? JSON.parse(os.laudoFotos) : (os.laudoFotos || []);
    if (photos.length > 0) {
      totalScore += config.PHOTOS_SCORE;
      regrasSatisfeitas.push({
        rule: 'FOTOS_ANEXADAS',
        points: config.PHOTOS_SCORE,
        evidence: `${photos.length} foto(s) anexada(s) ao laudo`
      });
    }

    // 8. Penalização de OS muito recente (menos de 2 horas)
    const dataCriacao = new Date(os.createdAt);
    const diffMs = Date.now() - dataCriacao.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 2) {
      totalScore -= config.NEW_OS_PENALTY;
      regrasSatisfeitas.push({
        rule: 'NOVA_OS_PENALTY',
        points: -config.NEW_OS_PENALTY,
        evidence: `Dedução por OS criada muito recentemente (${diffHours.toFixed(1)} horas)`
      });
    }

    const finalScore = Math.max(0, Math.min(100, totalScore));

    if (finalScore < config.THRESHOLD_MEDIUM) {
      return null;
    }

    const confidenceLevel = finalScore >= config.THRESHOLD_HIGH ? 'HIGH' : 'MEDIUM';
    const reasons = regrasSatisfeitas.map(r => `${r.evidence} (${r.points >= 0 ? '+' : ''}${r.points} pts)`);
    const motivoResumo = reasons.join(' E ');

    return {
      orderId: os.id,
      osNumber: os.osNumber,
      clienteName: clientName,
      equipamentoName: deviceName,
      statusAtual: 'AGUARDANDO_AVALIACAO',
      statusSugerido: 'AGUARDANDO_AUTORIZACAO',
      scoreConfianca: finalScore,
      confidenceLevel,
      regrasSatisfeitas,
      motivoResumo,
      totalCost: valorTotal,
      laborCost: valorMaoDeObra,
      partsCount,
      createdAt: os.createdAt,
      whatsappJaEnviado: whatsappEnviado
    };
  }
}

export interface AvaliacaoSuggestion {
  orderId: string;
  osNumber: string;
  clienteName: string;
  equipamentoName: string;
  statusAtual: 'AGUARDANDO_AVALIACAO';
  statusSugerido: 'AGUARDANDO_AUTORIZACAO';
  scoreConfianca: number;
  confidenceLevel: 'HIGH' | 'MEDIUM';
  regrasSatisfeitas: RuleSatisfied[];
  motivoResumo: string;
  totalCost: number;
  laborCost: number;
  partsCount: number;
  createdAt: string;
  whatsappJaEnviado: boolean;
}
