import { PrismaClient } from '@prisma/client';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

const osNumbers = [
  '230165','230636','230703','230704','231175','231229','231817','231824',
  '231825','231832','232936','233050','233187','233383','233538','233898',
  '234126','234130','234665','234703','234727','234826','234827','234834',
  '234836','234837','234928','235001','235025','235029','235030','235087','235088'
];

async function main() {
  // Check related records first
  const msgs = await prisma.messageHistory.count({ where: { order: { osNumber: { in: osNumbers } } } });
  const concs = await prisma.oSConciliationItem.count({ where: { order: { osNumber: { in: osNumbers } } } });
  console.log(`MessageHistory relacionadas: ${msgs}`);
  console.log(`OSConciliationItem relacionadas: ${concs}`);

  // Build rollback
  const records = await prisma.ordemServico.findMany({
    where: { osNumber: { in: osNumbers } },
    select: {
      id: true, osNumber: true, status: true, statusCode: true,
      clientLegacyId: true, deviceLegacyId: true
    }
  });

  const rollbackPath = resolve(__dirname, 'rollback-excluir-33-os.sql');
  let sql = '-- Rollback: reinserir as 33 OS excluídas do SH Oficina\nBEGIN;\n';
  for (const r of records) {
    sql += `INSERT INTO ordem_servicos (id, "osNumber", status, "statusCode", "clientLegacyId", "deviceLegacyId", "created_at")
            VALUES ('${r.id}', '${r.osNumber}', '${r.status}', ${r.statusCode}, '${r.clientLegacyId}', '${r.deviceLegacyId}', NOW())
            ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += 'COMMIT;\n';
  writeFileSync(rollbackPath, sql, 'utf8');
  console.log(`Rollback salvo: ${rollbackPath}`);

  // Delete (cascade handles MessageHistory and OSConciliationItem)
  const { count } = await prisma.ordemServico.deleteMany({ where: { osNumber: { in: osNumbers } } });
  console.log(`\nOrdemServico deletadas: ${count}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
