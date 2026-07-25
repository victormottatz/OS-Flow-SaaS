import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

// Reverse map for rollback
let rollbackData = [];

const STATUS_MAP = {
  0: 'ORCAMENTO',
  1: 'AGUARDANDO_AVALIACAO',
  2: 'AGUARDANDO_AUTORIZACAO',
  3: 'AGUARDANDO_PECA',
  4: 'FINALIZADO',
  5: 'PRONTO_RETIRADA',
  6: 'PAGO_PRONTO_RETIRADA',
  7: 'FINALIZADO',
  8: 'AGUARDANDO_AVALIACAO',
  9: 'AGUARDANDO_AVALIACAO',
  10: 'FINALIZADO',
  11: 'FINALIZADO',
  12: 'AGUARDANDO_AVALIACAO',
  15: 'EM_MANUTENCAO',
  16: 'EM_MANUTENCAO',
  17: 'EM_MANUTENCAO',
  18: 'AGUARDANDO_AVALIACAO',
  23: 'FINALIZADO',
  24: 'FINALIZADO',
  25: 'FINALIZADO',
};

async function captureRollback() {
  rollbackData = await prisma.ordemServico.findMany({
    select: { id: true, createdAt: true, status: true, statusCode: true, entryDate: true }
  });
}

async function fixCreatedAt() {
  console.log('\n--- Fixing createdAt from entryDate ---');
  const pendings = rollbackData.filter(r => r.entryDate && r.createdAt.toISOString().startsWith('2026-07-21'));
  console.log(`  ${pendings.length} records with createdAt from migration date and non-null entryDate`);

  if (pendings.length === 0) return 0;

  const fix = await prisma.$executeRawUnsafe(`
    UPDATE ordem_servicos
    SET "createdAt" = "entryDate"
    WHERE "entryDate" IS NOT NULL
      AND "createdAt" >= '2026-07-21'::timestamp
      AND "createdAt" < '2026-07-22'::timestamp
  `);
  console.log(`  Fixed ${fix} records`);
  return fix;
}

async function fixStatus() {
  console.log('\n--- Fixing status from statusCode ---');
  
  const toFix = await prisma.ordemServico.count({
    where: { status: 'AGUARDANDO_AVALIACAO', statusCode: { not: 0 } }
  });
  console.log(`  ${toFix} records with status=AGUARDANDO_AVALIACAO but non-zero statusCode`);

  if (toFix === 0) return 0;

  // Use a DO block with a record-by-record approach to avoid CASE issues
  // with the enum cast in a mixed-type expression
  const fix = await prisma.$executeRawUnsafe(`
    UPDATE ordem_servicos os
    SET status = sub.new_status
    FROM (
      SELECT id,
        CASE
          WHEN "statusCode" = 1  THEN 'AGUARDANDO_AVALIACAO'
          WHEN "statusCode" = 2  THEN 'AGUARDANDO_AUTORIZACAO'
          WHEN "statusCode" = 3  THEN 'AGUARDANDO_PECA'
          WHEN "statusCode" = 4  THEN 'FINALIZADO'
          WHEN "statusCode" = 5  THEN 'PRONTO_RETIRADA'
          WHEN "statusCode" = 6  THEN 'PAGO_PRONTO_RETIRADA'
          WHEN "statusCode" = 7  THEN 'FINALIZADO'
          WHEN "statusCode" = 8  THEN 'AGUARDANDO_AVALIACAO'
          WHEN "statusCode" = 9  THEN 'AGUARDANDO_AVALIACAO'
          WHEN "statusCode" = 10 THEN 'FINALIZADO'
          WHEN "statusCode" = 11 THEN 'FINALIZADO'
          WHEN "statusCode" = 12 THEN 'AGUARDANDO_AVALIACAO'
          WHEN "statusCode" = 15 THEN 'EM_MANUTENCAO'
          WHEN "statusCode" = 16 THEN 'EM_MANUTENCAO'
          WHEN "statusCode" = 17 THEN 'EM_MANUTENCAO'
          WHEN "statusCode" = 18 THEN 'AGUARDANDO_AVALIACAO'
          WHEN "statusCode" = 23 THEN 'FINALIZADO'
          WHEN "statusCode" = 24 THEN 'FINALIZADO'
          WHEN "statusCode" = 25 THEN 'FINALIZADO'
        END::"OSStatus" as new_status
      FROM ordem_servicos
      WHERE status = 'AGUARDANDO_AVALIACAO'
        AND "statusCode" != 0
    ) sub
    WHERE os.id = sub.id
  `);
  console.log(`  Fixed ${fix} records`);
  return fix;
}

async function generateReport() {
  console.log('\n=== POST-BACKFILL REPORT ===\n');

  const total = await prisma.ordemServico.count();
  const withEntryDate = await prisma.ordemServico.count({ where: { entryDate: { not: null } } });
  
  // Check if createdAt now matches entryDate for records with entryDate
  const matching = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count FROM ordem_servicos
    WHERE "entryDate" IS NOT NULL
      AND "createdAt"::date = "entryDate"::date
  `);

  const statusDist = await prisma.ordemServico.groupBy({
    by: ['status'],
    _count: true,
    orderBy: { status: 'asc' }
  });

  console.log(`Total OS: ${total}`);
  console.log(`With entryDate: ${withEntryDate}`);
  console.log(`createdAt matches entryDate: ${matching[0]?.count || 0}`);
  console.log(`\nStatus Distribution:`);
  for (const s of statusDist) {
    console.log(`  ${s.status.padEnd(25)}: ${s._count}`);
  }
}

async function exportRollback() {
  console.log('\n--- Exporting rollback SQL ---');
  // rollbackData was captured BEFORE changes — use original values
  // Records that got createdAt changed: had entryDate AND original createdAt was migration date
  const createdAtChanges = rollbackData.filter(r =>
    r.entryDate && r.createdAt.toISOString().startsWith('2026-07-21')
  );

  // Records that got status changed: original status was AGUARDANDO_AVALIACAO and statusCode != 0
  const statusChanges = rollbackData.filter(r =>
    r.status === 'AGUARDANDO_AVALIACAO' && r.statusCode !== 0
  );

  console.log(`  Records where createdAt changed: ${createdAtChanges.length}`);
  console.log(`  Records where status changed: ${statusChanges.length}`);

  const sqlLines = [];
  
  if (createdAtChanges.length > 0) {
    sqlLines.push('-- Rollback createdAt to migration timestamp');
    sqlLines.push("UPDATE ordem_servicos SET \"createdAt\" = '2026-07-21T00:00:00.000Z'");
    sqlLines.push(`WHERE id IN (${createdAtChanges.map(r => `'${r.id}'`).join(',')});`);
    sqlLines.push(`-- Rollback file: Affected ${createdAtChanges.length} records`);
  }

  if (statusChanges.length > 0) {
    sqlLines.push('\n-- Rollback status to AGUARDANDO_AVALIACAO (migration default)');
    sqlLines.push("UPDATE ordem_servicos SET status = 'AGUARDANDO_AVALIACAO'::\"OSStatus\"");
    sqlLines.push(`WHERE id IN (${statusChanges.map(r => `'${r.id}'`).join(',')});`);
    sqlLines.push(`-- Rollback file: Affected ${statusChanges.length} records`);
  }

  if (sqlLines.length > 0) {
    writeFileSync(resolve(__dirname, 'rollback-backfill.sql'), sqlLines.join('\n'), 'utf8');
    console.log(`  Rollback saved to: ${resolve(__dirname, 'rollback-backfill.sql')}`);
  } else {
    console.log('  No changes to roll back.');
  }
}

async function main() {
  console.log('=== REVERSIBLE BACKFILL ===');
  console.log(`Date: ${new Date().toISOString()}`);

  // 1. Capture current state for rollback
  await captureRollback();

  // 2. Fix createdAt
  const createdAtFixed = await fixCreatedAt();

  // 3. Fix status
  const statusFixed = await fixStatus();

  // 4. Generate report
  await generateReport();

  // 5. Export rollback SQL
  await exportRollback();

  console.log('\n=== BACKFILL COMPLETE ===');
  if (createdAtFixed + statusFixed > 0) {
    console.log(`  Changes: ${createdAtFixed} createdAt + ${statusFixed} status = ${createdAtFixed + statusFixed} total`);
  } else {
    console.log('  No changes needed.');
  }
  console.log('  Rollback file saved alongside this script.');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
