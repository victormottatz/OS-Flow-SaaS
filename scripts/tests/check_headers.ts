import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const migrationDir = path.join(process.cwd(), 'temp_migration');

function checkCsvHeaders(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const firstLine = content.split('\n')[0] || '';
  console.log(`\nCSV: ${path.basename(filePath)}`);
  console.log('Delimiter / Headers:', firstLine);
}

function checkXlsHeaders(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  console.log(`\nXLS: ${path.basename(filePath)}`);
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z2');
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (cell && cell.v) headers.push(String(cell.v));
    }
    console.log('Headers:', headers.join(' | '));
  } catch (err: any) {
    console.error('Error reading XLS:', err.message);
  }
}

console.log('Scanning temp_migration...');
const files = fs.readdirSync(migrationDir);
for (const file of files) {
  const fullPath = path.join(migrationDir, file);
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (file.endsWith('.csv')) {
      checkCsvHeaders(fullPath);
    } else if (file.endsWith('.xls') || file.endsWith('.xlsx')) {
      checkXlsHeaders(fullPath);
    }
  }
}
