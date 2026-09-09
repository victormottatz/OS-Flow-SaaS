-- ============================================================================
-- MIGRAÇÃO: Etiquetas personalizadas (v2)
-- Objetivo: permitir etiquetas por escopo (Cliente, OS, Aparelho, Global) e
--           etiquetas pessoais por usuário (ownerId) além das etiquetas da
--           oficina (ownerId NULL = compartilhada).
-- Compatível com prisma/schema.prisma (model Tag + enum TagScope).
-- Pode ser aplicada repetidamente (idempotente).
-- ============================================================================

-- 1) Enum de escopo (mesmo nome usado pelo Prisma)
DO $$ BEGIN
  CREATE TYPE "TagScope" AS ENUM ('GLOBAL', 'CLIENT', 'DEVICE', 'ORDEM_SERVICO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Novas colunas
ALTER TABLE "tags"
  ADD COLUMN IF NOT EXISTS "scope"       "TagScope" NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN IF NOT EXISTS "description" TEXT       NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "ownerId"     TEXT;

-- 3) Relação com o usuário dono da etiqueta (etiqueta pessoal)
-- Nota: o PostgreSQL não aceita ADD CONSTRAINT IF NOT EXISTS; usamos um DO block idempotente.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_ownerId_fkey') THEN
    ALTER TABLE "tags"
      ADD CONSTRAINT "tags_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Índices para filtragem por dono e escopo
CREATE INDEX IF NOT EXISTS "tags_ownerId_idx" ON "tags"("ownerId");
CREATE INDEX IF NOT EXISTS "tags_scope_idx"   ON "tags"("scope");

-- 5) Etiquetas existentes viram etiquetas da oficina (GLOBAL), sem dono
UPDATE "tags" SET "scope" = 'GLOBAL', "ownerId" = NULL WHERE "ownerId" IS NULL;
