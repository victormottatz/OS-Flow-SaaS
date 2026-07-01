import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function analyzeFile(filePath: string) {
  console.log(`\n--- Analyzing ${path.basename(filePath)} ---`);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    
    console.log(`Total Rows (incl. header): ${rowCount}`);
    console.log(`Total Columns: ${colCount}`);
    
    // Get headers
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (data.length > 0) {
      console.log(`Headers: ${JSON.stringify(data[0])}`);
    }
    
    // Print first 2 rows for sample
    if (data.length > 1) {
      console.log(`Sample Row 1: ${JSON.stringify(data[1])}`);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
}

const file1 = path.join(process.cwd(), 'EXPOTAÇÃO-SH OFICINA', 'ESTOQUE-(antigo).xlsx');
const file2 = path.join(process.cwd(), 'EXPOTAÇÃO-SH OFICINA', 'estoque 01_07-(novo).xls');

analyzeFile(file1);
analyzeFile(file2);
