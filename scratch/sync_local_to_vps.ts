import { PrismaClient } from '@prisma/client';

async function syncDatabases() {
  const localUrl = "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres?schema=public";
  const vpsUrl = "postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5433/postgres_teste?schema=public";

  const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } });
  const prismaVps = new PrismaClient({ datasources: { db: { url: vpsUrl } } });

  // Prisma models in proper insertion order
  const models = [
    'user',
    'tag',
    'supplier',
    'client',
    'device',
    'part',
    'ordemServico',
    'serviceItem',
    'partUsage',
    'payment',
    'deviceNote',
    'deviceCategory',
    'officeSetting',
    'rolePermission',
    'oSConciliationBatch',
    'oSConciliationItem',
    'customField',
    'customFieldValue',
    'featureFlag',
    'messageHistory',
    'auditLog',
    'blingConfig',
    'migrationRun',
    'migrationLog',
    'migrationMapping'
  ];

  // Implicit many-to-many tables that need Raw SQL
  const m2mTables = [
    '_ClientToTag',
    '_DeviceToTag',
    '_OrdemServicoToTag'
  ];

  const dbTablesForTruncate = [
    'users', 'tags', 'fornecedores', 'clients', 'devices', 'parts', 'ordem_servicos',
    'service_items', 'part_usages', 'payments', 'device_notes', 'device_categories',
    'office_settings', 'role_permissions', 'os_conciliation_batches', 'os_conciliation_items',
    'custom_fields', 'custom_field_values', 'feature_flags', 'message_history', 'audit_logs',
    'bling_configs', 'migration_runs', 'migration_logs', 'migration_mappings',
    ...m2mTables
  ];

  try {
    console.log("Iniciando sincronização LOCAL -> VPS via Prisma createMany...");

    console.log("Limpando banco da VPS...");
    const truncateQuery = `TRUNCATE TABLE ${dbTablesForTruncate.map(t => `"${t}"`).join(', ')} CASCADE;`;
    await prismaVps.$executeRawUnsafe(truncateQuery);
    console.log("✅ Banco da VPS limpo.");

    // Sync Prisma Models
    for (const model of models) {
      console.log(`Copiando modelo: ${model}...`);
      const rows = await (prismaLocal as any)[model].findMany();
      if (rows.length === 0) {
        console.log(`  -> 0 registros.`);
        continue;
      }

      // Prisma createMany is very efficient and handles types!
      await (prismaVps as any)[model].createMany({
        data: rows,
        skipDuplicates: true // Just in case
      });
      console.log(`  -> ✅ ${rows.length} registros copiados.`);
    }

    // Sync Many-to-Many via Raw SQL (they only contain IDs, so no type issues)
    for (const table of m2mTables) {
      console.log(`Copiando tabela de relacionamento: ${table}...`);
      const rows = await prismaLocal.$queryRawUnsafe<any[]>(`SELECT * FROM "${table}"`);
      if (rows.length === 0) {
        console.log(`  -> 0 registros.`);
        continue;
      }

      const BATCH_SIZE = 1000;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        if (batch.length === 0) break;
        const columns = Object.keys(batch[0]);
        const values: any[] = [];
        const placeholders = batch.map((row, rowIndex) => {
          const rowPlaceholders = columns.map((col, colIndex) => {
            values.push(row[col]);
            return `$${rowIndex * columns.length + colIndex + 1}`;
          });
          return `(${rowPlaceholders.join(', ')})`;
        }).join(', ');
        
        const insertQuery = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders}`;
        await prismaVps.$executeRawUnsafe(insertQuery, ...values);
        inserted += batch.length;
      }
      console.log(`  -> ✅ ${inserted} relacionamentos copiados.`);
    }

    console.log("\n🎉 SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!");

  } catch (err: any) {
    console.error("❌ Erro durante a sincronização:", err);
  } finally {
    await prismaLocal.$disconnect();
    await prismaVps.$disconnect();
  }
}

syncDatabases();
