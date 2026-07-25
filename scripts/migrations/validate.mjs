import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function main() {
  // ========== 1. Verify ENTRADA dates ==========
  const noEntryDate = await prisma.ordemServico.count({ where: { entryDate: null } });
  const total = await prisma.ordemServico.count();
  const withEntryDate = await prisma.ordemServico.findMany({
    where: { entryDate: { not: null } },
    select: { entryDate: true, createdAt: true },
    take: 5000,
    orderBy: { entryDate: 'asc' }
  });

  const dates = withEntryDate.map(r => r.entryDate).filter(Boolean);
  const minDate = dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
  const maxDate = dates.length ? dates.reduce((a, b) => a > b ? a : b) : null;

  console.log('=== PRE-MIGRATION VALIDATION ===\n');
  console.log(`Total OS records: ${total}`);
  console.log(`With entryDate: ${withEntryDate.length}`);
  console.log(`Null entryDate: ${noEntryDate}`);
  console.log(`Date range: ${minDate?.toISOString().slice(0,10) || 'N/A'} → ${maxDate?.toISOString().slice(0,10) || 'N/A'}`);
  const totalWithEntryDate = total - noEntryDate;
  console.log(`\n✓ ENTRADA field verified: ${totalWithEntryDate} of ${total} records have valid dates\n`);

  // ========== 2. Verify status mapping ==========
  const statusCodeDist = await prisma.ordemServico.groupBy({
    by: ['statusCode'],
    _count: true,
    orderBy: { statusCode: 'asc' }
  });

  console.log('=== StatusCode Distribution ===');
  for (const sc of statusCodeDist) {
    console.log(`  code ${String(sc.statusCode).padStart(2)}: ${sc._count}`);
  }
  console.log();

  // ========== 3. Current status distribution ==========
  const statusDist = await prisma.ordemServico.groupBy({
    by: ['status'],
    _count: true,
    orderBy: { status: 'asc' }
  });

  console.log('=== Current Status Distribution ===');
  for (const s of statusDist) {
    console.log(`  ${s.status.padEnd(25)}: ${s._count}`);
  }
  console.log();

  // ========== 4. Verify FK resolvability from snapshot ==========
  let snapshotPath;
  const snapDir = resolve(__dirname, '.snapshots');
  try {
    const files = readdirSync(snapDir).filter(f => f.endsWith('.json'));
    snapshotPath = files.length ? resolve(snapDir, files[0]) : null;
  } catch { snapshotPath = null; }

  if (snapshotPath) {
    const snap = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    const ordemsTable = snap.tables?.find(t => t.name === 'ORDEMS');
    if (ordemsTable) {
      const rows = ordemsTable.rows || [];
      const clientsInSnap = new Set(rows.map(r => String(r.COD_CLIENTE)).filter(Boolean));
      const devicesInSnap = new Set(rows.map(r => String(r.COD_EQUIP)).filter(Boolean));
      console.log(`=== Snapshot FK Analysis ===`);
      console.log(`  Total ORDEMS rows: ${rows.length}`);
      console.log(`  Unique clientLegacyIds: ${clientsInSnap.size}`);
      console.log(`  Unique deviceLegacyIds: ${devicesInSnap.size}`);
      console.log();

      const dbClients = await prisma.client.findMany({ select: { legacyId: true } });
      const dbDevices = await prisma.device.findMany({ select: { legacyId: true } });
      const dbClientLegacyIds = new Set(dbClients.map(c => c.legacyId).filter(Boolean));
      const dbDeviceLegacyIds = new Set(dbDevices.map(d => d.legacyId).filter(Boolean));

      const unresolvedClients = [...clientsInSnap].filter(id => !dbClientLegacyIds.has(id));
      const unresolvedDevices = [...devicesInSnap].filter(id => !dbDeviceLegacyIds.has(id));
      console.log(`  Unresolved clients: ${unresolvedClients.length} / ${clientsInSnap.size}`);
      if (unresolvedClients.length > 0) console.log(`    Sample: ${unresolvedClients.slice(0, 5).join(', ')}`);
      console.log(`  Unresolved devices: ${unresolvedDevices.length} / ${devicesInSnap.size}`);
      if (unresolvedDevices.length > 0) console.log(`    Sample: ${unresolvedDevices.slice(0, 5).join(', ')}`);
    }
  }

  console.log('\n=== VALIDATION COMPLETE ===');
  await prisma.$disconnect();
}

main().catch(e => { console.error('Validation failed:', e); process.exit(1); });
