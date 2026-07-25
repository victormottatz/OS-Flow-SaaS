import { PrismaClient, OSStatus, OSClosingReason } from '@prisma/client';
import { cleanPhone, generateOSNumber } from './utils.js';
import * as fs from 'fs';

export interface RowData {
  osNumber: string;
  clientName: string;
  phone: string;
  statusStr: string;
  totalCost: number;
  deviceType: string;
  reportedDefect: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
}

export abstract class BaseImportAgent {
  protected prisma: PrismaClient;
  protected logs: string[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // To be implemented by subclasses
  abstract getTargetStatus(): OSStatus;
  abstract getClosingReason(): OSClosingReason | null;
  abstract applySpecialRules(osData: any, row: RowData): any;

  public async processRow(row: RowData): Promise<void> {
    const osNum = generateOSNumber(row.osNumber);
    const clientNameUpper = row.clientName.toUpperCase();

    // 1. Find Client by exact name or phone
    const clientPhone = cleanPhone(row.phone);
    let client = null;

    if (clientPhone) {
      client = await this.prisma.client.findFirst({
        where: { phone: { contains: clientPhone } }
      });
    }

    if (!client && row.clientName) {
      client = await this.prisma.client.findFirst({
        where: { name: { equals: row.clientName, mode: 'insensitive' } }
      });
    }

    if (!client) {
      // Regra de Cliente Ausente: Sinalizar para confirmação visual
      this.logAnomaly(`[CLIENTE NÃO ENCONTRADO] OS ${osNum} - Cliente: ${row.clientName} / Tel: ${row.phone}`);
      return;
    }

    // 2. Regra de OS Existente: Update se já existir
    const existingOs = await this.prisma.ordemServico.findFirst({
      where: {
        osNumber: { startsWith: `OS-${row.osNumber}` }
      }
    });

    if (existingOs) {
      const dataToUpdate = this.applySpecialRules({
        status: this.getTargetStatus(),
        closingReason: this.getClosingReason(),
        totalCost: row.totalCost,
        reportedDefect: row.reportedDefect
      }, row);

      await this.prisma.ordemServico.update({
        where: { id: existingOs.id },
        data: dataToUpdate
      });
      console.log(`[UPDATE] OS ${existingOs.osNumber} atualizada para ${this.getTargetStatus()}`);
      return;
    }

    // 3. Buscar ou criar Equipamento (Device)
    let device = await this.prisma.device.findFirst({
      where: { clientId: client.id, type: row.deviceType }
    });

    if (!device) {
      device = await this.prisma.device.create({
        data: {
          clientId: client.id,
          type: row.deviceType || 'Desconhecido',
          brand: row.deviceBrand || 'Desconhecida',
          model: row.deviceModel || 'Desconhecido',
          serialNumber: row.serialNumber || 'Sem Série'
        }
      });
    }

    // 4. Criar a OS
    const newOsData = this.applySpecialRules({
      osNumber: osNum,
      clientId: client.id,
      deviceId: device.id,
      reportedDefect: row.reportedDefect || 'Sem defeito relatado',
      status: this.getTargetStatus(),
      closingReason: this.getClosingReason(),
      totalCost: row.totalCost || 0
    }, row);

    await this.prisma.ordemServico.create({
      data: newOsData
    });
    console.log(`[CREATE] OS ${osNum} criada com status ${this.getTargetStatus()}`);
  }

  protected logAnomaly(msg: string) {
    console.warn(msg);
    fs.appendFileSync('import_pendencies.log', msg + '\n');
  }
}
