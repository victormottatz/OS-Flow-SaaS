const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  console.log(`\n--- Analyzing ${path.basename(filePath)} ---`);
  try {
    const fileData = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileData, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range
    const ref = worksheet['!ref'];
    if (!ref) {
      console.log('Empty sheet');
      return;
    }
    const range = XLSX.utils.decode_range(ref);
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

const file1 = path.join(__dirname, '..', 'EXPOTAÇÃO-SH OFICINA', 'ESTOQUE-(antigo).xlsx');
const file2 = path.join(__dirname, '..', 'EXPOTAÇÃO-SH OFICINA', 'estoque 01_07-(novo).xls');

analyzeFile(file1);
analyzeFile(file2);
