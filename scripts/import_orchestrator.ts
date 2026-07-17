import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import { RowData, BaseImportAgent } from './import_agents/BaseImportAgent.js';
import {
  AguardandoAvaliacaoAgent,
  AguardandoAutorizacaoAgent,
  AguardandoPecaAgent,
  ReparoEmAndamentoAgent,
  ProntoRetiradaAgent,
  PagoProntoRetiradaAgent,
  FinalizadoAgent
} from './import_agents/agents.js';

const prisma = new PrismaClient();

function getAgentForStatus(status: string, prismaClient: PrismaClient): BaseImportAgent | null {
  status = status.toUpperCase();
  
  if (status.includes('AGUARDANDO AVALIAÇÃO') || status.includes('GARANTIA AGUAR. AVALIAÇÃO')) {
    return new AguardandoAvaliacaoAgent(prismaClient);
  }
  if (status.includes('AGUARDANDO AUTORIZAÇÃO DE ORÇAMENTO') || status.includes('GARANTIA (AVALIADO)')) {
    return new AguardandoAutorizacaoAgent(prismaClient);
  }
  if (status.includes('AGUARDANDO PEÇA')) {
    return new AguardandoPecaAgent(prismaClient);
  }
  if (status.includes('AUTORIZADO - REPARO EM ANDAMENTO') || status.includes('FABRICA')) {
    return new ReparoEmAndamentoAgent(prismaClient);
  }
  if (status.includes('MENSAGEM ENVIADA') || status.includes('PRONTO/CLIENTE AVISADO - FALTA PGTO') || status.includes('GARANTIA - PRONTO')) {
    return new ProntoRetiradaAgent(prismaClient);
  }
  if (status.includes('PAGO - CLIENTE AVISADO')) {
    return new PagoProntoRetiradaAgent(prismaClient);
  }
  if (
    status.includes('EQUIPAMENTO ENTREGUE REPARADO') ||
    status.includes('EQUIPAMENTO ENTREGUE - FALTA PGTO') ||
    status.includes('EQUIPAMENTO DEVOLVIDO SEM REPARO') ||
    status.includes('DESISTIU/SEM CONSERTO/SEM DEFEITO') ||
    status.includes('APARELHO DESCARTADO')
  ) {
    return new FinalizadoAgent(prismaClient);
  }

  return null;
}

async function main() {
  const filePath = "D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\ordens de serviço 17.07 16_46.xls";
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[];

  let startIndex = -1;
  for (let i = 0; i < 10; i++) {
    const row = data[i];
    if (row && Array.isArray(row)) {
      const idx = row.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('situa'));
      if (idx !== -1) {
        startIndex = i + 1; // data starts after header
        break;
      }
    }
  }

  if (startIndex === -1) {
    console.error("Could not find headers in Excel.");
    return;
  }

  console.log(`Starting import from row ${startIndex}...`);

  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue; // skip empty rows

    const osNumber = row[0] ? row[0].toString() : '';
    const clientName = row[1] ? row[1].toString() : '';
    const phone = row[2] ? row[2].toString() : '';
    const statusStr = row[8] ? row[8].toString() : '';
    const totalCostStr = row[9] ? row[9].toString() : '0';
    const totalCost = parseFloat(totalCostStr.replace(',', '.')) || 0;
    
    const deviceType = row[10] ? row[10].toString() : '';
    const reportedDefect = row[11] ? row[11].toString() : '';
    const deviceBrand = row[12] ? row[12].toString() : '';
    const deviceModel = row[13] ? row[13].toString() : '';
    const serialNumber = row[14] ? row[14].toString() : '';

    const rowData: RowData = {
      osNumber, clientName, phone, statusStr, totalCost,
      deviceType, reportedDefect, deviceBrand, deviceModel, serialNumber
    };

    const agent = getAgentForStatus(statusStr, prisma);
    
    if (agent) {
      await agent.processRow(rowData);
    } else {
      console.warn(`[AVISO] Nenhum agente encontrado para o status: '${statusStr}' na OS ${osNumber}`);
    }
  }

  console.log("Importação concluída. Verifique import_pendencies.log para anomalias.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
