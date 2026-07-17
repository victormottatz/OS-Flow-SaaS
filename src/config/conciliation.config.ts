import prisma from "../database/prisma";

/**
 * Dynamic Weights and Thresholds Configuration for OS Conciliation Module.
 * Standard fallback values.
 */
export const CONCILIATION_CONFIG = {
  // Pesos Positivos (Hierarquia de Evidências)
  OS_NUMBER_MATCH_SCORE: 40,
  PHYSICAL_PRESENT_SCORE: 30,
  PAYMENT_INTEGRAL_SCORE: 20,
  TEMPORAL_MATCH_HIGH_SCORE: 15,
  TEMPORAL_MATCH_MEDIUM_SCORE: 5,

  // Penalidades (Deduções)
  MULTIPLE_OS_PENALTY: 30,
  TEMPORAL_CONFLICT_PENALTY: 40,
  NAME_ONLY_MATCH_PENALTY: 20,
  MULTIPLE_HISTORY_PENALTY: 20,

  // Thresholds de confiança (Mapeamento de Classificação)
  CONFIDENCE_HIGH: 90,
  CONFIDENCE_MEDIUM: 70,

  // Limites operacionais
  DAYS_TEMPORAL_HIGH: 15,
  DAYS_TEMPORAL_MEDIUM: 90,
  VALUE_TOLERANCE_BRL: 2.0,
  INACTIVITY_MONTHS: 6
};

export async function getActiveConciliationConfig() {
  try {
    const dbSettings = await prisma.officeSetting.findMany({
      where: { category: "CONCILIACAO" }
    });

    const config = { ...CONCILIATION_CONFIG };

    dbSettings.forEach(s => {
      const val = Number(s.value);
      if (isNaN(val)) return;

      switch (s.key) {
        case 'os_number_match_score':
          config.OS_NUMBER_MATCH_SCORE = val;
          break;
        case 'physical_present_score':
          config.PHYSICAL_PRESENT_SCORE = val;
          break;
        case 'payment_integral_score':
          config.PAYMENT_INTEGRAL_SCORE = val;
          break;
        case 'temporal_match_high_score':
          config.TEMPORAL_MATCH_HIGH_SCORE = val;
          break;
        case 'temporal_match_medium_score':
          config.TEMPORAL_MATCH_MEDIUM_SCORE = val;
          break;
        case 'multiple_os_penalty':
          config.MULTIPLE_OS_PENALTY = val;
          break;
        case 'temporal_conflict_penalty':
          config.TEMPORAL_CONFLICT_PENALTY = val;
          break;
        case 'name_only_match_penalty':
          config.NAME_ONLY_MATCH_PENALTY = val;
          break;
        case 'multiple_history_penalty':
          config.MULTIPLE_HISTORY_PENALTY = val;
          break;
        case 'threshold_automatic':
          config.CONFIDENCE_HIGH = val;
          break;
        case 'threshold_review':
          config.CONFIDENCE_MEDIUM = val;
          break;
        case 'days_temporal_high':
          config.DAYS_TEMPORAL_HIGH = val;
          break;
        case 'days_temporal_medium':
          config.DAYS_TEMPORAL_MEDIUM = val;
          break;
        case 'value_tolerance_brl':
          config.VALUE_TOLERANCE_BRL = val;
          break;
      }
    });

    return config;
  } catch (error) {
    console.error('[Config] Erro ao carregar configurações de conciliação do banco. Usando padrões.', error);
    return CONCILIATION_CONFIG;
  }
}

export const AVALIACAO_CONFIG = {
  ORCAMENTO_SCORE: 40,
  LABOR_SCORE: 20,
  PARTS_SCORE: 15,
  DIAGNOSTIC_SCORE: 10,
  WHATSAPP_SCORE: 10,
  LAUDO_MACRO_SCORE: 5,
  PHOTOS_SCORE: 5,
  NEW_OS_PENALTY: 30,
  THRESHOLD_HIGH: 80,
  THRESHOLD_MEDIUM: 50
};

export async function getActiveAvaliacaoConfig() {
  try {
    const dbSettings = await prisma.officeSetting.findMany({
      where: { category: "CONCILIACAO_AVALIACAO" }
    });

    const config = { ...AVALIACAO_CONFIG };

    dbSettings.forEach(s => {
      const val = Number(s.value);
      if (isNaN(val)) return;

      switch (s.key) {
        case 'avaliacao_orcamento_score':
          config.ORCAMENTO_SCORE = val;
          break;
        case 'avaliacao_labor_score':
          config.LABOR_SCORE = val;
          break;
        case 'avaliacao_parts_score':
          config.PARTS_SCORE = val;
          break;
        case 'avaliacao_diagnostic_score':
          config.DIAGNOSTIC_SCORE = val;
          break;
        case 'avaliacao_whatsapp_score':
          config.WHATSAPP_SCORE = val;
          break;
        case 'avaliacao_laudo_macro_score':
          config.LAUDO_MACRO_SCORE = val;
          break;
        case 'avaliacao_photos_score':
          config.PHOTOS_SCORE = val;
          break;
        case 'avaliacao_new_os_penalty':
          config.NEW_OS_PENALTY = val;
          break;
        case 'avaliacao_threshold_high':
          config.THRESHOLD_HIGH = val;
          break;
        case 'avaliacao_threshold_medium':
          config.THRESHOLD_MEDIUM = val;
          break;
      }
    });

    return config;
  } catch (error) {
    console.error('[Config] Erro ao carregar configurações de conciliação de status do banco. Usando padrões.', error);
    return AVALIACAO_CONFIG;
  }
}

