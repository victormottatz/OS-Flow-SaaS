import fs from 'fs';
import * as path from 'path';
import xlsx from 'xlsx';

import { PDFParse } from 'pdf-parse';

export interface CaixaEntry {
  filePath: string;
  fileName: string;
  date: string;
  cliente: string;
  os: string;
  equipamento: string;
  formaPag: string;
  valor: number;
}

export interface BrunoPayment {
  filePath: string;
  fileName: string;
  refMonth: string; // Ex: "07/2025"
  cliente: string;
  valor: number;
}

export interface PhysicalReadyOS {
  osNumberClean: string;
  cliente: string;
  entrada: string;
  situacao: string;
  total: number;
  equipamento: string;
  marca: string;
  modelo: string;
  serie: string;
}

interface CacheData {
  processedFiles: Record<string, { mtime: number; size: number }>;
  caixaEntries: CaixaEntry[];
  brunoPayments: BrunoPayment[];
}

export class OSConciliatorService {
  private static cacheFilePath = path.join(process.cwd(), 'temp', 'conciliation_cache.json');
  private static baseDir = path.join(process.cwd(), 'MGV');

  /**
   * Loads all historical data (caixa & payments) either from cache or by parsing files.
   */
  static async loadHistoricalData(): Promise<{ 
    caixaEntries: CaixaEntry[]; 
    brunoPayments: BrunoPayment[]; 
    physicalReadyOSs: PhysicalReadyOS[];
  }> {
    // Ensure temp dir exists
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let cache: CacheData = {
      processedFiles: {},
      caixaEntries: [],
      brunoPayments: []
    };

    if (fs.existsSync(this.cacheFilePath)) {
      try {
        cache = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
      } catch (e) {
        console.error('[OSConciliatorService] Failed to read cache file, rebuilding...', e);
      }
    }

    const currentFilesState: Record<string, { mtime: number; size: number }> = {};
    const pdfFilesToProcess: string[] = [];
    const xlsxFilesToProcess: string[] = [];

    // Scan for Caixa PDFs
    const years = ['2025', '2026'];
    for (const year of years) {
      const yearDir = path.join(this.baseDir, year, 'FECHAMENTO DIÁRIO');
      if (!fs.existsSync(yearDir)) continue;

      const months = fs.readdirSync(yearDir);
      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        if (!fs.statSync(monthDir).isDirectory()) continue;

        const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.pdf'));
        for (const file of files) {
          const filePath = path.join(monthDir, file);
          const stat = fs.statSync(filePath);
          const relPath = path.relative(this.baseDir, filePath);
          currentFilesState[relPath] = { mtime: stat.mtimeMs, size: stat.size };

          const cached = cache.processedFiles[relPath];
          if (!cached || cached.mtime !== stat.mtimeMs || cached.size !== stat.size) {
            pdfFilesToProcess.push(filePath);
          }
        }
      }
    }

    // Scan for Bruno Payments XLSX
    const pagamentosDir = path.join(this.baseDir, 'PAGAMENTOS');
    if (fs.existsSync(pagamentosDir)) {
      const files = fs.readdirSync(pagamentosDir).filter(f => f.endsWith('.xlsx'));
      for (const file of files) {
        const filePath = path.join(pagamentosDir, file);
        const stat = fs.statSync(filePath);
        const relPath = path.relative(this.baseDir, filePath);
        currentFilesState[relPath] = { mtime: stat.mtimeMs, size: stat.size };

        const cached = cache.processedFiles[relPath];
        if (!cached || cached.mtime !== stat.mtimeMs || cached.size !== stat.size) {
          xlsxFilesToProcess.push(filePath);
        }
      }
    }

    let cacheUpdated = false;

    // Remove deleted files from cache entries
    const activeRelPaths = new Set(Object.keys(currentFilesState));
    const cachedRelPaths = Object.keys(cache.processedFiles);
    for (const cachedPath of cachedRelPaths) {
      if (!activeRelPaths.has(cachedPath)) {
        // Remove associated entries
        cache.caixaEntries = cache.caixaEntries.filter(e => path.relative(this.baseDir, e.filePath) !== cachedPath);
        cache.brunoPayments = cache.brunoPayments.filter(p => path.relative(this.baseDir, p.filePath) !== cachedPath);
        delete cache.processedFiles[cachedPath];
        cacheUpdated = true;
      }
    }

    // Process new/updated PDFs
    if (pdfFilesToProcess.length > 0) {
      console.log(`[OSConciliatorService] Processing ${pdfFilesToProcess.length} new/updated PDFs...`);
      for (const filePath of pdfFilesToProcess) {
        const relPath = path.relative(this.baseDir, filePath);
        // Remove existing entries for this file just in case
        cache.caixaEntries = cache.caixaEntries.filter(e => e.filePath !== filePath);
        
        const entries = await this.parseCaixaPdf(filePath);
        cache.caixaEntries.push(...entries);
        
        cache.processedFiles[relPath] = currentFilesState[relPath];
        cacheUpdated = true;
      }
    }

    // Process new/updated XLSX
    if (xlsxFilesToProcess.length > 0) {
      console.log(`[OSConciliatorService] Processing ${xlsxFilesToProcess.length} new/updated XLSX planilhas...`);
      for (const filePath of xlsxFilesToProcess) {
        const relPath = path.relative(this.baseDir, filePath);
        // Remove existing entries for this file just in case
        cache.brunoPayments = cache.brunoPayments.filter(p => p.filePath !== filePath);

        const payments = this.parseBrunoXlsx(filePath);
        cache.brunoPayments.push(...payments);

        cache.processedFiles[relPath] = currentFilesState[relPath];
        cacheUpdated = true;
      }
    }

    // Save cache if updated
    if (cacheUpdated) {
      console.log(`[OSConciliatorService] Saving updated cache to ${this.cacheFilePath}`);
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
    }

    return {
      caixaEntries: cache.caixaEntries,
      brunoPayments: cache.brunoPayments,
      physicalReadyOSs: this.loadPhysicalReadyOSs()
    };
  }

  /**
   * Reads and parses the physical list of ready equipment from Excel sheet.
   */
  static loadPhysicalReadyOSs(): PhysicalReadyOS[] {
    const filePath = path.join(process.cwd(), 'APARELHOS DISPONÍVEIS PARA RETIRADA - MENSAGEM ENVIADA.xlsx');
    if (!fs.existsSync(filePath)) {
      console.warn(`[OSConciliatorService] Planilha física não encontrada em: ${filePath}`);
      return [];
    }

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const physicalOSs: PhysicalReadyOS[] = [];
      // A primeira linha de dados reais está no índice 3 (4ª linha da planilha)
      for (let i = 3; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] !== undefined && row[0] !== null && row[0] !== '') {
          const osNo = row[0].toString().trim();
          if (osNo) {
            physicalOSs.push({
              osNumberClean: osNo,
              cliente: row[1]?.toString().trim() || '',
              entrada: row[2]?.toString().trim() || '',
              situacao: row[3]?.toString().trim() || '',
              total: typeof row[4] === 'number' ? row[4] : parseFloat(row[4]?.toString() || '0'),
              equipamento: row[5]?.toString().trim() || '',
              marca: row[6]?.toString().trim() || '',
              modelo: row[7]?.toString().trim() || '',
              serie: row[8]?.toString().trim() || ''
            });
          }
        }
      }
      return physicalOSs;
    } catch (e) {
      console.error('[OSConciliatorService] Erro ao ler a planilha física de prontos:', e);
      return [];
    }
  }

  /**
   * Helper to parse a Fechamento Caixa PDF into logical entries.
   */
  private static async parseCaixaPdf(filePath: string): Promise<CaixaEntry[]> {
    const entries: CaixaEntry[] = [];
    try {
      const parser = new PDFParse({ url: filePath, verbosity: 0 });
      const result = await parser.getText();
      await parser.destroy();

      const textData = typeof result === 'string' ? result : (result.text || '');
      const lines = textData.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      // Extract date (ex: 01/07/2025)
      const dateMatch = textData.match(/(\d{2}\/\d{2}\/\d{4})/);
      const date = dateMatch ? dateMatch[1] : path.basename(filePath, '.pdf');

      let inTable = false;
      let blockLines: string[] = [];

      const finalizeBlock = (linesList: string[]) => {
        if (linesList.length === 0) return;

        const firstLine = linesList[0];
        const clientMatch = firstLine.match(/^[A-ZÁÉÍÓÚÂÊÔÇ\s.-]+/);
        let cliente = clientMatch ? clientMatch[0].trim() : 'DESCONHECIDO';

        const words = cliente.split(/\s+/);
        const cleanWords: string[] = [];
        for (const w of words) {
          if (/^\d+$/.test(w) || w === 'SEDEX') break;
          cleanWords.push(w);
        }
        cliente = cleanWords.join(' ').trim();

        const blockText = linesList.join('\n');

        // Extract O.S. (6 digits or SEDEX)
        const osMatches = blockText.match(/\b(23\d{4}|SEDEX)\b/g) || [];
        const osList = Array.from(new Set(osMatches));

        // Extract values
        const valMatches = blockText.match(/R\$\s*[\d.]+(,\d{2})?/g) || [];
        const valores = valMatches.map(valStr => {
          return parseFloat(
            valStr
              .replace('R$', '')
              .replace(/\./g, '')
              .replace(',', '.')
              .trim()
          );
        }).filter(v => !isNaN(v));

        // Detect payment methods
        const payMethods = ['PIX', 'DINHEIRO', 'CARTÃO', 'CRED.', 'DEB.', 'BOLETO', 'DEPÓSITO', 'ACERTO'];
        const formaPagList: string[] = [];
        for (const lineOfBlock of linesList) {
          const upperLine = lineOfBlock.toUpperCase();
          for (const pm of payMethods) {
            if (upperLine.includes(pm) && !upperLine.includes('CLIENTE') && !upperLine.includes('VALOR')) {
              // Extract the payment method info
              const idx = upperLine.indexOf(pm);
              const rest = lineOfBlock.substring(idx).replace(/R\$\s*[\d.]+(,\d{2})?/g, '').trim();
              if (rest && !formaPagList.includes(rest)) {
                formaPagList.push(rest);
              } else if (!formaPagList.includes(pm)) {
                formaPagList.push(pm);
              }
            }
          }
        }

        const formaPag = formaPagList.join(', ') || 'Não Especificada';
        const valorTotal = valores.reduce((a, b) => a + b, 0);

        // We can create one entry per OS found in the block, or a consolidated one
        const os = osList[0] || 'Sem OS';

        entries.push({
          filePath,
          fileName: path.basename(filePath),
          date,
          cliente,
          os,
          equipamento: '', // Can be detailed if needed
          formaPag,
          valor: valorTotal
        });
      };

      for (const line of lines) {
        if (line.includes('CLIENTE') && line.includes('VALOR')) {
          inTable = true;
          continue;
        }
        if (line.includes('TOTAL')) {
          inTable = false;
          finalizeBlock(blockLines);
          blockLines = [];
          continue;
        }

        if (!inTable) continue;

        const upperLine = line.toUpperCase();
        const isReserved = upperLine.startsWith('R$') || 
                          /^\d+,\d{2}$/.test(line) ||
                          upperLine.startsWith('CARTÃO') || 
                          upperLine.startsWith('DINHEIRO') || 
                          upperLine.startsWith('PIX') || 
                          upperLine.startsWith('BOLETO') || 
                          upperLine.startsWith('DEPÓSITO') ||
                          /^\d{6}$/.test(line);
                          
        const isNewClient = /^[A-ZÁÉÍÓÚÂÊÔÇ]/.test(line) && !isReserved;

        if (isNewClient) {
          finalizeBlock(blockLines);
          blockLines = [line];
        } else {
          blockLines.push(line);
        }
      }

      finalizeBlock(blockLines);

    } catch (e) {
      console.error(`[OSConciliatorService] Error parsing PDF ${path.basename(filePath)}:`, e);
    }
    return entries;
  }

  /**
   * Helper to parse a Bruno Payment XLSX sheet.
   */
  private static parseBrunoXlsx(filePath: string): BrunoPayment[] {
    const payments: BrunoPayment[] = [];
    const fileName = path.basename(filePath);

    // Extract reference month from file name (ex: "PAGAMENTOS FEITOS PARA O BRUNO 08-2025.xlsx" -> Ref Month = "07/2025")
    let refMonth = 'Desconhecido';
    const monthYearMatch = fileName.match(/(\d{2})-(\d{4})/);
    if (monthYearMatch) {
      let month = parseInt(monthYearMatch[1]);
      let year = parseInt(monthYearMatch[2]);
      
      // The file name month is usually the payout month (m+1), reference is month (m)
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
      refMonth = `${month.toString().padStart(2, '0')}/${year}`;
    }

    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] !== undefined && row[0] !== null && row[1] !== undefined && row[1] !== null && row[1] !== '') {
          if (typeof row[0] === 'number' && typeof row[1] === 'string') {
            const valor = row[0];
            const cliente = row[1].trim();
            
            // Ignore headers/summary rows
            if (cliente.toUpperCase().includes('EM HAVER') || cliente.toUpperCase().includes('VALE') || cliente.toUpperCase().includes('BADÁ')) {
              continue;
            }

            payments.push({
              filePath,
              fileName,
              refMonth,
              cliente,
              valor
            });
          }
        }
      }
    } catch (e) {
      console.error(`[OSConciliatorService] Error parsing XLSX ${fileName}:`, e);
    }

    return payments;
  }
}
