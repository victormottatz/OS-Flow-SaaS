import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

interface ExcelEquipamento {
  CODIGO: number | string;
  COD_CLIENTE: number | string;
  DESCRICAO?: string;
  MARCA?: string;
  MODELO?: string;
  SERIE?: string;
  PAT?: string;
}

async function main() {
  console.log('Starting equipment synchronization...');
  
  const excelPath = 'C:\\Users\\User\\Downloads\\EQUIPAMENTOS.xls';
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const rows: ExcelEquipamento[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Total rows in Excel file: ${rows.length}`);

  // Fetch all existing clients indexed by legacyId
  console.log('Loading clients from database...');
  const clients = await prisma.client.findMany({
    select: { id: true, legacyId: true }
  });

  const clientMap = new Map<string, string>();
  for (const client of clients) {
    if (client.legacyId) {
      clientMap.set(String(client.legacyId), client.id);
    }
  }

  console.log(`Loaded ${clients.length} clients into memory (${clientMap.size} with legacyId).`);

  let linkedCount = 0;
  let unlinkedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  const BATCH_SIZE = 100;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (row) => {
        try {
          const deviceLegacyId = String(row.CODIGO);
          const clientLegacyId = row.COD_CLIENTE ? String(row.COD_CLIENTE) : null;
          
          let clientId: string | null = null;
          if (clientLegacyId && clientMap.has(clientLegacyId)) {
            clientId = clientMap.get(clientLegacyId)!;
            linkedCount++;
          } else {
            unlinkedCount++;
          }

          const description = row.DESCRICAO?.trim() || 'Sem Descrição';
          const brand = row.MARCA?.trim() || 'NÃO INFORMADO';
          const model = row.MODELO?.trim() || 'NÃO INFORMADO';
          const serialNumber = (row.SERIE && row.SERIE.trim() !== '' && row.SERIE.trim().toUpperCase() !== 'NÃO POSSUI')
            ? row.SERIE.trim()
            : 'Sem Série';
          const patrimony = (row.PAT && row.PAT.trim() !== '' && row.PAT.trim().toUpperCase() !== 'NÃO POSSUI')
            ? row.PAT.trim()
            : '';

          await prisma.device.upsert({
            where: { legacyId: deviceLegacyId },
            update: {
              type: description,
              description: description,
              brand: brand,
              model: model,
              serialNumber: serialNumber,
              patrimony: patrimony,
              clientLegacyId: clientLegacyId,
              clientId: clientId,
            },
            create: {
              legacyId: deviceLegacyId,
              type: description,
              description: description,
              brand: brand,
              model: model,
              serialNumber: serialNumber,
              patrimony: patrimony,
              clientLegacyId: clientLegacyId,
              clientId: clientId,
            },
          });

          successCount++;
        } catch (err) {
          console.error(`Error processing device CODIGO ${row.CODIGO}:`, err);
          errorCount++;
        }
      })
    );

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} rows...`);
    }
  }

  console.log('\n--- Sync Summary ---');
  console.log(`Total Excel Rows: ${rows.length}`);
  console.log(`Successfully Processed: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Equipments linked to Clients: ${linkedCount}`);
  console.log(`Equipments without matching Client: ${unlinkedCount}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
