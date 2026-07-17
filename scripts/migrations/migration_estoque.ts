import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const prisma = new PrismaClient();

const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(',', '.').replace(/[^0-9.-]+/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseIntStock = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  const str = String(val).replace(',', '.').replace(/[^0-9.-]+/g, '');
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
};

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const filePath = path.join(process.cwd(), 'EXPOTAÇÃO-SH OFICINA', 'estoque 01_07-(novo).xls');
  
  console.log(`\n--- Starting Migration for: ${path.basename(filePath)} ---`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (No data will be saved)' : 'EXECUTION (Upserting to DB)'}`);

  const fileData = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileData, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  
  let totalRead = data.length;
  let totalProcessed = 0;
  let totalErrors = 0;
  let invalidRecords = 0;

  for (const row of data as any[]) {
    const rawCode = row['CODIGO'];
    const rawName = row['NOME'];
    
    // Integrity validation
    if (rawCode === null || rawCode === undefined || rawCode === '' || rawName === null || rawName === undefined || rawName === '') {
      invalidRecords++;
      continue;
    }

    const code = String(rawCode).trim();
    const name = String(rawName).trim();
    const stock = parseIntStock(row['ESTOQUE_DISP']);
    const cost = parseNumber(row['CUSTO']);
    const price = parseNumber(row['VENDA']);

    if (!isDryRun) {
      try {
        await prisma.part.upsert({
          where: { code },
          update: {
            name,
            stock,
            cost,
            price
          },
          create: {
            code,
            name,
            stock,
            cost,
            price
          }
        });
        totalProcessed++;
      } catch (err) {
        console.error(`Error processing code ${code}:`, err);
        totalErrors++;
      }
    } else {
      totalProcessed++; 
    }
  }

  console.log('\n--- Sumário Executivo ---');
  console.log(`Total lido (linhas na planilha): ${totalRead}`);
  console.log(`Registros ignorados (código ou nome nulo): ${invalidRecords}`);
  console.log(`Total ${isDryRun ? 'processável' : 'migrado com sucesso'}: ${totalProcessed}`);
  console.log(`Total com erro: ${totalErrors}`);

  if (!isDryRun) {
    const countDB = await prisma.part.count();
    console.log(`Total de registros no banco (Prisma Part count): ${countDB}`);
  }

  console.log('\nAção necessária: ' + (isDryRun ? 'Validar os dados e rodar sem --dry-run' : 'Aguardar arquivos de Clientes/OS.'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
