-- ==============================================================================
-- OS FLOW SAAS — DDL ESTRUTURAL DE BANCO DE DADOS (POSTGRESQL LIMPO)
-- Todas as tabelas, tipos ENUM, índices e constraints de chave estrangeira
-- Sem nenhum registro ou dado de cliente/peça preenchido.
-- ==============================================================================

-- 1. ENUMS
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'SUPERVISOR', 'EDITOR', 'ATTENDANT', 'TECHNICIAN', 'FINANCIAL');
CREATE TYPE "OSStatus" AS ENUM ('AGUARDANDO_AVALIACAO', 'AGUARDANDO_AUTORIZACAO', 'AGUARDANDO_PECA', 'EM_MANUTENCAO', 'PRONTO_RETIRADA', 'PAGO_PRONTO_RETIRADA', 'FINALIZADO');
CREATE TYPE "OSClosingReason" AS ENUM ('REPARO_CONCLUIDO', 'ORCAMENTO_RECUSADO', 'SEM_CONSERTO', 'DESCARTE_CLIENTE_RETIRA', 'DESCARTE_OFICINA', 'EQUIPAMENTO_SEM_DEFEITO');
CREATE TYPE "WarrantyType" AS ENUM ('NENHUMA', 'FABRICA', 'MGV');
CREATE TYPE "OSFinancialStatus" AS ENUM ('PENDENTE', 'CREDIARIO', 'PAGAR_DEPOIS', 'PAGO');
CREATE TYPE "BillingStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'FATURADO', 'REJEITADO', 'TIMEOUT');
CREATE TYPE "TagScope" AS ENUM ('GLOBAL', 'CLIENT', 'DEVICE', 'ORDEM_SERVICO');

-- 2. TABELA DE EMPRESAS / TENANTS (SAAS)
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. USUÁRIOS
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "phone" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLIENTES
CREATE TABLE IF NOT EXISTS "clients" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "cpf_cnpj" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "state_inscription" TEXT,
    "rg" TEXT,
    "deleted_at" TIMESTAMP(3),
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. EQUIPAMENTOS / APARELHOS
CREATE TABLE IF NOT EXISTS "devices" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "client_id" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "warranty_expires_at" TIMESTAMP(3),
    "last_maintenance_at" TIMESTAMP(3),
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. PEÇAS DE ESTOQUE
CREATE TABLE IF NOT EXISTS "parts" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_min" INTEGER DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requires_serial" BOOLEAN NOT NULL DEFAULT false,
    "supplier" TEXT,
    "location" TEXT,
    "nota_fiscal_entrada_id" TEXT,
    "unit" TEXT DEFAULT 'UN',
    "gtin" TEXT,
    "ncm" TEXT,
    "cest" TEXT,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. ORDENS DE SERVIÇO
CREATE TABLE IF NOT EXISTS "ordens_servico" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "os_number" TEXT NOT NULL,
    "client_id" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
    "device_id" TEXT NOT NULL REFERENCES "devices"("id") ON DELETE RESTRICT,
    "reported_defect" TEXT NOT NULL,
    "accessories_left" TEXT NOT NULL,
    "physical_state" TEXT NOT NULL,
    "status" "OSStatus" NOT NULL DEFAULT 'AGUARDANDO_AVALIACAO',
    "diagnostic" TEXT,
    "laudo_macro" TEXT,
    "used_parts" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "checklist_entrada" JSONB DEFAULT '[]'::jsonb,
    "checklist_saida" JSONB DEFAULT '[]'::jsonb,
    "laudo_fotos" JSONB DEFAULT '[]'::jsonb,
    "labor_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calibration_cost" DOUBLE PRECISION DEFAULT 0,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billing_status" "BillingStatus" NOT NULL DEFAULT 'PENDENTE',
    "billing_logs" JSONB DEFAULT '[]'::jsonb,
    "payment_method" TEXT,
    "warranty_type" "WarrantyType" NOT NULL DEFAULT 'MGV',
    "financial_status" "OSFinancialStatus" NOT NULL DEFAULT 'PENDENTE',
    "financial_due_date" TIMESTAMP(3),
    "assigned_technician_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "stress_test_started_at" TIMESTAMP(3),
    "stress_test_started_by" TEXT,
    "original_exit_date" TIMESTAMP(3),
    "closing_reason" "OSClosingReason",
    "profit_value" DOUBLE PRECISION,
    "profit_margin_percent" DOUBLE PRECISION,
    "deleted_at" TIMESTAMP(3),
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. CONFIGURAÇÃO DE INTEGRAÇÃO BLING
CREATE TABLE IF NOT EXISTS "bling_configs" (
    "id" SERIAL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "environment" TEXT NOT NULL DEFAULT 'production',
    "company_id" TEXT UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. CONFIGURAÇÕES DA OFICINA
CREATE TABLE IF NOT EXISTS "office_settings" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "office_settings_company_key_unique" UNIQUE ("company_id", "key")
);

-- 10. TAGS
CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "scope" "TagScope" NOT NULL DEFAULT 'GLOBAL',
    "description" TEXT,
    "owner_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. CHATS E MENSAGENS DE WHATSAPP
CREATE TABLE IF NOT EXISTS "whatsapp_chats" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "remote_jid" TEXT NOT NULL,
    "name" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "client_id" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_chats_company_remote_jid_unique" UNIQUE ("company_id", "remote_jid")
);

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "chat_id" TEXT NOT NULL REFERENCES "whatsapp_chats"("id") ON DELETE CASCADE,
    "message_id" TEXT,
    "from_me" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT NOT NULL,
    "media_url" TEXT,
    "media_type" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sender_name" TEXT,
    "transcription" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "action" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" TEXT,
    "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. ÍNDICES DE PERFORMANCE E MULTITENANT
CREATE INDEX IF NOT EXISTS "idx_clients_company" ON "clients"("company_id");
CREATE INDEX IF NOT EXISTS "idx_devices_company" ON "devices"("company_id");
CREATE INDEX IF NOT EXISTS "idx_parts_company" ON "parts"("company_id");
CREATE INDEX IF NOT EXISTS "idx_os_company" ON "ordens_servico"("company_id");
CREATE INDEX IF NOT EXISTS "idx_os_status" ON "ordens_servico"("status");
CREATE INDEX IF NOT EXISTS "idx_wa_chats_company" ON "whatsapp_chats"("company_id");
CREATE INDEX IF NOT EXISTS "idx_wa_messages_chat" ON "whatsapp_messages"("chat_id");
