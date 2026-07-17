import { PrismaClient, OSStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  // Format: DD/MM/YYYY HH:mm:ss
  const parts = dateStr.trim().split(' ');
  if (parts.length === 0) return null;
  
  const dateParts = parts[0].split('/');
  if (dateParts.length !== 3) return null;
  
  const timeParts = parts.length > 1 ? parts[1].split(':') : ['00', '00', '00'];
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
  const year = parseInt(dateParts[2], 10);
  
  const hours = parseInt(timeParts[0] || '0', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  const seconds = parseInt(timeParts[2] || '0', 10);
  
  const dt = new Date(year, month, day, hours, minutes, seconds);
  return isNaN(dt.getTime()) ? null : dt;
};

const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(',', '.').replace(/[^0-9.-]+/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const filePath = path.join(process.cwd(), 'temp_migration', 'ordens de seviços.csv');
  
  console.log(`\n--- Starting Migration for: ${path.basename(filePath)} ---`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (No data will be saved)' : 'EXECUTION (Upserting to DB)'}`);

  // Fetch all clients and devices
  console.log('Loading mappings from DB...');
  const clients = await prisma.client.findMany({ select: { id: true, legacyId: true } });
  const clientMap = new Map<string, string>();
  for (const client of clients) {
    if (client.legacyId) clientMap.set(client.legacyId, client.id);
  }

  const devices = await prisma.device.findMany({ select: { id: true, legacyId: true } });
  const deviceMap = new Map<string, string>();
  for (const device of devices) {
    if (device.legacyId) deviceMap.set(device.legacyId, device.id);
  }
  console.log('Mappings loaded.');

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
  let missingRelationships = 0;
  let invalidRecords = 0;
  
  const statusCounts: Record<string, number> = {};

  for (const row of results) {
    const osNumber = String(row['CODIGO'] || '').trim();
    const codCliente = String(row['COD_CLIENTE'] || '').trim();
    const codEquip = String(row['COD_EQUIP'] || '').trim();
    
    if (!osNumber || !codCliente || !codEquip) {
      invalidRecords++;
      continue;
    }

    const clientId = clientMap.get(codCliente);
    const deviceId = deviceMap.get(codEquip);
    
    if (!clientId || !deviceId) {
      console.warn(`ERRO_RELACIONAMENTO: OS ${osNumber} - Cliente (${codCliente}) ou Equipamento (${codEquip}) não encontrado.`);
      missingRelationships++;
      continue;
    }

    // Status Map
    const rawStatus = String(row['SITUACAO'] || '').trim();
    let status: OSStatus = OSStatus.AGUARDANDO_AVALIACAO;
    
    if (rawStatus === '0') {
      status = OSStatus.AGUARDANDO_AVALIACAO;
    } else if (rawStatus === '10') {
      status = OSStatus.FINALIZADO;
    } else if (rawStatus === '11') {
      status = OSStatus.PRONTO_RETIRADA;
    } else {
      console.warn(`WARNING: OS ${osNumber} tem status desconhecido (${rawStatus}). Assumindo AGUARDANDO_AVALIACAO.`);
    }

    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const reportedDefect = row['DEFEITO'] || 'Não informado';
    const accessoriesLeft = row['ACESSORIO'] || 'Nenhum';
    const physicalState = row['OBS_APARELHO'] || 'Não especificado';
    const diagnostic = row['LAUDO'] || null;

    const vMao = parseNumber(row['V_MAO']);
    const vPecas = parseNumber(row['V_PECAS']);
    const vDesloca = parseNumber(row['V_DESLOCA']);
    const vTerceiro = parseNumber(row['V_TERCEIRO']);
    const vOutros = parseNumber(row['V_OUTROS']);
    
    const laborCost = vMao;
    const totalCost = vMao + vPecas + vDesloca + vTerceiro + vOutros;

    const originalEntryDate = parseDate(row['ENTRADA']);
    const originalExitDate = parseDate(row['SAIDA']);

    if (!isDryRun) {
      try {
        await prisma.ordemServico.upsert({
          where: { osNumber },
          update: {
            clientId,
            deviceId,
            reportedDefect,
            accessoriesLeft,
            physicalState,
            status,
            diagnostic,
            laborCost,
            totalCost,
            originalEntryDate,
            originalExitDate
          },
          create: {
            osNumber,
            clientId,
            deviceId,
            reportedDefect,
            accessoriesLeft,
            physicalState,
            status,
            diagnostic,
            laborCost,
            totalCost,
            originalEntryDate,
            originalExitDate
          }
        });
        totalProcessed++;
      } catch (err) {
        console.error(`Error processing OS ${osNumber}:`, err);
        totalErrors++;
      }
    } else {
      totalProcessed++; 
    }
  }

  console.log('\n--- Sumário Executivo (Fase 3: Ordens de Serviço) ---');
  console.log(`Total lido (linhas na planilha): ${totalRead}`);
  console.log(`Registros ignorados (código nulo): ${invalidRecords}`);
  console.log(`Erros de Relacionamento (Cliente/Equip nulo): ${missingRelationships}`);
  console.log(`Total ${isDryRun ? 'processável' : 'migrado com sucesso'}: ${totalProcessed}`);
  console.log(`Total com erro de gravação: ${totalErrors}`);
  
  console.log('\n--- Estatísticas de Status ---');
  for (const [s, count] of Object.entries(statusCounts)) {
    console.log(`${s}: ${count}`);
  }

  if (!isDryRun) {
    const countDB = await prisma.ordemServico.count();
    console.log(`\nTotal de registros de OS no banco: ${countDB}`);
  }

  console.log('\nAção necessária: ' + (isDryRun ? 'Validar os dados e rodar sem --dry-run' : 'Migração concluída com sucesso.'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
