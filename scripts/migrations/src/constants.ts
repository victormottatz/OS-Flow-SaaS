// ============================================================================
// SH Oficina → MGV Migration Pipeline — Constants
// ============================================================================

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Pipeline ---
export const PIPELINE_CONTRACT_VERSION = "1.0.0";
export const IMPORTER_VERSION = "1.0.0";

// --- Dictionary ---
export const DICTIONARY_VERSION = "1.0.0";
export const DICTIONARY_PATH = resolve(__dirname, "../dictionary.json");

// --- Hashing ---
export const HASH_ALGORITHM = "sha256";

// --- Schema ---
export const SCHEMA_VERSION = "1.0.0";
export const EXTRACT_VERSION = "1.0.0";

// --- Snapshot ---
export const SNAPSHOT_DIR = ".snapshots";
export const SNAPSHOT_NAMING = "sh-oficina-{hash8}-{date}.json";

// --- MDB ---
export const MDB_TABLES = [
  "CLIENTES",
  "EQUIPAMENTOS",
  "ESTOQUE",
  "FORNECEDORES",
  "GRUPO_FORNEC",
  "MARCA",
  "MODELO",
  "ORCAMENTOS",
  "ORDEMS",
  "OS_SERVICOS",
  "OS_PECAS",
  "CONTAS",
  "NOTAS_COMPRAS_FATURAS",
  "PESSOA",
  "PRODUTO",
  "SERVICO",
  "SERVOS",
  "SETOR",
  "SUB GRUPO",
  "USUARIO",
  "VEICULOS",
] as const;

export const MDB_TABLES_TO_IMPORT = [
  "CLIENTES",
  "EQUIPAMENTOS",
  "ORDEMS",
  "OS_SERVICOS",
  "OS_PECAS",
  "CONTAS",
] as const;

// --- Persistence ---
export const BATCH_SIZE = 500;

// --- Entity Names (for Mapping table) ---
export const ENTITY_NAMES = [
  "Client",
  "Device",
  "OrdemServico",
  "Payment",
] as const;

// --- Status Mapping (SH Oficina → MGV) ---
export const OS_STATUS_MAP: Record<string, string> = {
  "0": "ORCAMENTO",
  "1": "AGUARDANDO_AVALIACAO",
  "3": "AGUARDANDO_AUTORIZACAO",
  "6": "EM_MANUTENCAO",
  "7": "EM_MANUTENCAO",
  "8": "PAGO_PRONTO_RETIRADA",
  "9": "PRONTO_RETIRADA",
  "10": "FINALIZADO",
  "11": "FINALIZADO",
  "12": "AGUARDANDO_PECA",
  "13": "AGUARDANDO_AVALIACAO",
  "15": "FINALIZADO",
  "16": "AGUARDANDO_AVALIACAO",
  "17": "PRONTO_RETIRADA",
  "18": "AGUARDANDO_AUTORIZACAO",
  "23": "PRONTO_RETIRADA",
  "24": "FINALIZADO",
  "25": "AGUARDANDO_AUTORIZACAO",
  
  // SH specific states (fallbacks)
  "EQUIPAMENTO ENTREGUE REPARADO": "PRONTO_RETIRADA",
  "ORCAMENTO RECUSADO": "FINALIZADO",
  "Aguardando orçamento": "AGUARDANDO_AVALIACAO",
  "Aguardando autorização": "AGUARDANDO_AUTORIZACAO",
  "Aguardando peça": "AGUARDANDO_PECA",
  "Em manutenção": "EM_MANUTENCAO",
  "Orçamento aprovado": "AGUARDANDO_PECA",
};

// --- File Patterns ---
export const MDB_GLOB = "*.mdb";
export const CSV_GLOB = "*.csv";
export const XLS_GLOB = "*.xls";
