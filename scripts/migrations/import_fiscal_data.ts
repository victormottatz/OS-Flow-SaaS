/**
 * Script de importação de dados fiscais da tabela ITENS do MDB (SH Oficina)
 * para o model Part no PostgreSQL.
 * 
 * Uso:
 *   npx tsx scripts/migrations/import_fiscal_data.ts --dry-run
 *   npx tsx scripts/migrations/import_fiscal_data.ts
 * 
 * Lê a tabela ITENS do Dados1.mdb e atualiza os registros Part existentes
 * no PostgreSQL com os campos fiscais correspondentes (match por code = NUMERO).
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const MDBReader = require('mdb-reader').default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(',', '.').replace(/[^0-9.\-]+/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseStr = (val: any, fallback: string = ''): string => {
  if (val === null || val === undefined) return fallback;
  return String(val).trim() || fallback;
};

const parseBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toUpperCase() === 'S' || val === '1' || val === 'true';
  return !!val;
};

interface MdbItemRow {
  CODIGO: number;
  NUMERO: string;
  NOME: string;
  UNIDADE: string;
  NC_MERCOSUL: string | null;
  CEST: string | null;
  GTIN: string | null;
  NUMERO_FAB: string;
  FABRICANTE: string;
  CNPJFab: string | null;
  GRUPO: string;
  SUBGRUPO: string;
  PESO_BRUTO: number;
  PESO_LIQUIDO: number;
  C_CST_O: string;
  C_CST: string;
  C_ICMS: number;
  C_ICMS_ST: number;
  C_IPI: number;
  C_RED_BCALC: number;
  CFOP_INUF: string;
  CFOP_OUTUF: string;
  PIS_ALIQ: string;
  COFINS_ALIQ: string;
  IPI_cEnq: string;
  vTotTrib: string;
  cBenef: string | null;
  indEscala: string;
  vBCSTRet: string;
  vICMSSTRet: string;
  pST: string;
  vICMSSubstituto: string;
  pRedBCEfet: string;
  vBCEfet: string;
  pICMSEfet: string;
  vICMSEfet: string;
  USA_SERIAL: boolean;
  ESTOQUE_DISP: number;
  ESTOQUE_MIN: number;
  CUSTO: string;
  VENDA: string;
  LOCAL: string;
  FORNECEDOR: number;
  [key: string]: any;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const mdbPath = join(__dirname, '..', '..', 'Dados1.mdb');
  console.log(`\n=== Importação de Dados Fiscais do MDB ===`);
  console.log(`Arquivo MDB: ${mdbPath}`);
  console.log(`Modo: ${isDryRun ? '🔍 DRY RUN (sem alterações no banco)' : '🚀 EXECUÇÃO REAL'}\n`);

  // Ler o MDB
  const buffer = readFileSync(mdbPath);
  const db = new MDBReader(buffer);
  const table = db.getTable('ITENS');
  const rows: MdbItemRow[] = table.getData() as MdbItemRow[];

  console.log(`Total de itens encontrados na tabela ITENS: ${rows.length}\n`);

  let matched = 0;
  let notFound = 0;
  let updated = 0;
  let errors = 0;
  const notFoundItems: string[] = [];

  for (const row of rows) {
    const code = parseStr(row.NUMERO);
    if (!code) {
      errors++;
      continue;
    }

    // Buscar Part pelo código
    const part = await prisma.part.findFirst({
      where: { code, deletedAt: null }
    });

    if (!part) {
      notFound++;
      notFoundItems.push(`${code} - ${parseStr(row.NOME)}`);
      continue;
    }

    matched++;

    const fiscalData = {
      unit: parseStr(row.UNIDADE, 'UN'),
      ncm: parseStr(row.NC_MERCOSUL) || null,
      cest: parseStr(row.CEST as any) || null,
      gtin: parseStr(row.GTIN as any) || null,
      manufacturerCode: parseStr(row.NUMERO_FAB) || null,
      manufacturer: parseStr(row.FABRICANTE) || null,
      cnpjFab: parseStr(row.CNPJFab as any) || null,
      partGroup: parseStr(row.GRUPO) || null,
      partSubgroup: parseStr(row.SUBGRUPO) || null,
      weightGross: parseNumber(row.PESO_BRUTO),
      weightNet: parseNumber(row.PESO_LIQUIDO),
      cstOrigem: parseStr(row.C_CST_O, '0'),
      cstIcms: parseStr(row.C_CST, '000'),
      icmsAliq: parseNumber(row.C_ICMS),
      icmsStAliq: parseNumber(row.C_ICMS_ST),
      icmsRedBc: parseNumber(row.C_RED_BCALC),
      cfopIntraEstadual: parseStr(row.CFOP_INUF, '5102'),
      cfopInterEstadual: parseStr(row.CFOP_OUTUF, '6102'),
      ipiAliq: parseNumber(row.C_IPI),
      ipiEnquadramento: parseStr(row.IPI_cEnq, '999'),
      pisAliq: parseNumber(row.PIS_ALIQ),
      cofinsAliq: parseNumber(row.COFINS_ALIQ),
      totalTributos: parseNumber(row.vTotTrib),
      cBenef: parseStr(row.cBenef as any) || null,
      indEscala: parseStr(row.indEscala, 'S'),
      bcStRetido: parseNumber(row.vBCSTRet),
      icmsStRetido: parseNumber(row.vICMSSTRet),
      aliqSt: parseNumber(row.pST),
      icmsSubstituto: parseNumber(row.vICMSSubstituto),
      redBcEfet: parseNumber(row.pRedBCEfet),
      bcEfet: parseNumber(row.vBCEfet),
      icmsEfetAliq: parseNumber(row.pICMSEfet),
      icmsEfetValor: parseNumber(row.vICMSEfet),
    };

    if (!isDryRun) {
      try {
        await prisma.part.update({
          where: { id: part.id },
          data: fiscalData
        });
        updated++;
      } catch (err: any) {
        console.error(`  ❌ Erro ao atualizar ${code}: ${err.message}`);
        errors++;
      }
    } else {
      updated++;
      // Em dry-run, mostrar uma amostra dos primeiros 3
      if (matched <= 3) {
        console.log(`  [PREVIEW] ${code} - ${part.name}`);
        console.log(`    NCM: ${fiscalData.ncm || '(vazio)'}`);
        console.log(`    CST ICMS: ${fiscalData.cstIcms}`);
        console.log(`    CFOP: ${fiscalData.cfopIntraEstadual} / ${fiscalData.cfopInterEstadual}`);
        console.log(`    ICMS: ${fiscalData.icmsAliq}% | IPI: ${fiscalData.ipiAliq}%`);
        console.log(`    PIS: ${fiscalData.pisAliq}% | COFINS: ${fiscalData.cofinsAliq}%`);
        console.log('');
      }
    }
  }

  console.log('\n--- Sumário Executivo ---');
  console.log(`Total lido do MDB:           ${rows.length}`);
  console.log(`Match encontrado no banco:    ${matched}`);
  console.log(`Sem match (não encontrados):  ${notFound}`);
  console.log(`${isDryRun ? 'Atualizáveis' : 'Atualizados com sucesso'}: ${updated}`);
  console.log(`Erros:                        ${errors}`);

  if (notFoundItems.length > 0 && notFoundItems.length <= 20) {
    console.log('\nItens do MDB sem correspondência no banco:');
    notFoundItems.forEach(item => console.log(`  ⚠ ${item}`));
  } else if (notFoundItems.length > 20) {
    console.log(`\n⚠ ${notFoundItems.length} itens do MDB sem correspondência (primeiros 10):`);
    notFoundItems.slice(0, 10).forEach(item => console.log(`  ⚠ ${item}`));
  }

  if (isDryRun) {
    console.log('\n✅ Dry run concluído. Execute sem --dry-run para persistir no banco.');
  } else {
    console.log('\n✅ Importação de dados fiscais concluída!');
  }
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
