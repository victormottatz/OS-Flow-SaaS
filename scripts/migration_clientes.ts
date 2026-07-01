import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const filePath = path.join(process.cwd(), 'temp_migration', 'clientes.csv');
  
  console.log(`\n--- Starting Migration for: ${path.basename(filePath)} ---`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (No data will be saved)' : 'EXECUTION (Upserting to DB)'}`);

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
  let invalidRecords = 0;

  for (const row of results) {
    const legacyId = row['CODIGO'];
    const name = row['NOME'] || row['NFANTASIA'] || row['CONTATO'];
    
    if (!legacyId || !name) {
      invalidRecords++;
      continue;
    }

    const cpfCnpj = row['CPF_CNPJ'] || '';
    const phone = row['CELULAR'] || row['TELEFONE'] || '';
    const email = row['EMAIL'] || row['EMAIL_NFE'] || '';
    
    // Build address
    const endereco = row['ENDERECO'] || '';
    const numero = row['NUMERO'] || '';
    const complem = row['COMPLEM'] || '';
    const bairro = row['BAIRRO'] || '';
    const cidade = row['CIDADE'] || '';
    const uf = row['UF'] || '';
    const cep = row['CEP'] || '';
    
    const address = `${endereco}, ${numero} ${complem} - ${bairro}, ${cidade} - ${uf}, ${cep}`.replace(/\s+/g, ' ').trim();

    if (!isDryRun) {
      try {
        await prisma.client.upsert({
          where: { legacyId },
          update: {
            name,
            cpfCnpj,
            phone,
            email,
            address
          },
          create: {
            legacyId,
            name,
            cpfCnpj,
            phone,
            email,
            address
          }
        });
        totalProcessed++;
      } catch (err) {
        console.error(`Error processing client legacyId ${legacyId}:`, err);
        totalErrors++;
      }
    } else {
      totalProcessed++; 
    }
  }

  console.log('\n--- Sumário Executivo (Fase 1: Clientes) ---');
  console.log(`Total lido (linhas na planilha): ${totalRead}`);
  console.log(`Registros ignorados (código ou nome nulo): ${invalidRecords}`);
  console.log(`Total ${isDryRun ? 'processável' : 'migrado com sucesso'}: ${totalProcessed}`);
  console.log(`Total com erro: ${totalErrors}`);

  if (!isDryRun) {
    const countDB = await prisma.client.count();
    console.log(`Total de registros de Client no banco: ${countDB}`);
  }

  console.log('\nAção necessária: ' + (isDryRun ? 'Validar os dados e rodar sem --dry-run' : 'Aguardar aprovação para Fase 2 (Equipamentos).'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
