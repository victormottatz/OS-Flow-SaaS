import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const filePath = path.join(process.cwd(), 'temp_migration', 'equipamentos.csv');
  
  console.log(`\n--- Starting Migration for: ${path.basename(filePath)} ---`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (No data will be saved)' : 'EXECUTION (Upserting to DB)'}`);

  // Fetch all clients to map legacyId -> id
  const clients = await prisma.client.findMany({
    select: { id: true, legacyId: true }
  });
  
  const clientMap = new Map<string, string>();
  for (const client of clients) {
    if (client.legacyId) {
      clientMap.set(client.legacyId, client.id);
    }
  }

  const results: any[] = [];
  
  // Read CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ 
        separator: ';',
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '') 
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(true))
      .on('error', reject);
  });

  let totalRead = results.length;
  let totalProcessed = 0;
  let totalErrors = 0;
  let missingClientErros = 0;
  let invalidRecords = 0;

  for (const row of results) {
    const legacyId = row['CODIGO'];
    const codCliente = row['COD_CLIENTE'];
    const type = row['DESCRICAO'] || 'Sem Tipo';
    const brand = row['MARCA'] || 'Sem Marca';
    const model = row['MODELO'] || 'Sem Modelo';
    const serialNumber = row['SERIE'] || 'Sem Série';
    const description = row['OBSERVACOES'] || 'Sem observações.';
    
    if (!legacyId || !codCliente) {
      invalidRecords++;
      continue;
    }

    const clientId = clientMap.get(codCliente);
    if (!clientId) {
      console.warn(`ERRO_RELACIONAMENTO: Equipamento ${legacyId} - Cliente com CODIGO ${codCliente} não encontrado.`);
      missingClientErros++;
      continue;
    }

    if (!isDryRun) {
      try {
        await prisma.device.upsert({
          where: { legacyId },
          update: {
            clientId,
            type,
            brand,
            model,
            serialNumber,
            description
          },
          create: {
            legacyId,
            clientId,
            type,
            brand,
            model,
            serialNumber,
            description
          }
        });
        totalProcessed++;
      } catch (err) {
        console.error(`Error processing device legacyId ${legacyId}:`, err);
        totalErrors++;
      }
    } else {
      totalProcessed++; 
    }
  }

  console.log('\n--- Sumário Executivo (Fase 2: Equipamentos) ---');
  console.log(`Total lido (linhas na planilha): ${totalRead}`);
  console.log(`Registros ignorados (código de equipamento ou cliente nulo): ${invalidRecords}`);
  console.log(`Erros de Relacionamento (Cliente não encontrado): ${missingClientErros}`);
  console.log(`Total ${isDryRun ? 'processável' : 'migrado com sucesso'}: ${totalProcessed}`);
  console.log(`Total com erro de gravação: ${totalErrors}`);

  if (!isDryRun) {
    const countDB = await prisma.device.count();
    console.log(`Total de registros de Device no banco: ${countDB}`);
  }

  console.log('\nAção necessária: ' + (isDryRun ? 'Validar os dados e rodar sem --dry-run' : 'Aguardar aprovação para Fase 3 (OS).'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
