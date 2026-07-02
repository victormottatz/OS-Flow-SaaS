import fs from 'fs';
import { syncClientToBling } from '../src/services/bling';

// Delay function to avoid rate limits
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("Iniciando a importação em massa para o Bling...");
  
  const fileContent = fs.readFileSync('data/clientes_para_bling.csv', 'utf8');
  const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
  const dataLines = lines.slice(1);
  
  console.log(`Encontrados ${dataLines.length} clientes na planilha.`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(';');
    const rawName = cols[2]?.replace(/"/g, '') || '';
    const rawCpfCnpj = cols[18]?.replace(/"/g, '').replace(/\D/g, '') || '';
    const rawPhone = cols[12]?.replace(/"/g, '') || '';
    const rawEmail = cols[15]?.replace(/"/g, '') || '';
    const rawAddress = cols[4]?.replace(/"/g, '') || '';
    
    // Validations to avoid Bling API errors
    if (!rawCpfCnpj || rawCpfCnpj.length < 11) {
      console.log(`[${i+1}/${dataLines.length}] ⏭️  Ignorando ${rawName} - CPF/CNPJ invalido ou ausente: ${rawCpfCnpj}`);
      errorCount++;
      continue;
    }
    
    if (!rawName || rawName.trim() === '') {
      console.log(`[${i+1}/${dataLines.length}] ⏭️  Ignorando - Nome ausente.`);
      errorCount++;
      continue;
    }

    const clientData = {
      name: rawName,
      cpfCnpj: rawCpfCnpj,
      phone: rawPhone,
      email: rawEmail,
      address: rawAddress
    };

    try {
      const blingId = await syncClientToBling(clientData);
      console.log(`[${i+1}/${dataLines.length}] ✅ Sincronizado: ${rawName} -> Bling ID: ${blingId}`);
      successCount++;
    } catch (err: any) {
      console.error(`[${i+1}/${dataLines.length}] ❌ Erro ao sincronizar ${rawName}:`, err.message || err);
      errorCount++;
    }
    
    // Pequeno delay para evitar Rate Limit (Bling aceita cerca de 3 req/s)
    await delay(400); 
  }
  
  console.log("-----------------------------------------");
  console.log("IMPORTAÇÃO CONCLUÍDA!");
  console.log(`Sucessos: ${successCount}`);
  console.log(`Erros/Ignorados: ${errorCount}`);
}

main();
