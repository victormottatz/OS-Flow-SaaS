import fs from 'fs';
import axios from 'axios';
import { getAccessToken } from '../src/services/bling';

async function main() {
  const fileContent = fs.readFileSync('data/clientes_para_bling.csv', 'utf8');
  const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
  
  // Skip header
  const dataLines = lines.slice(1);
  
  // Pick 5 random clients
  const sampleSize = 5;
  const sample = [];
  for (let i = 0; i < sampleSize; i++) {
    const randomIndex = Math.floor(Math.random() * dataLines.length);
    sample.push(dataLines[randomIndex]);
  }
  
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('Nao foi possivel obter token');
      return;
    }
    
    console.log(`[Validation] Checking ${sampleSize} clients...`);
    for (const line of sample) {
      const cols = line.split(';');
      const name = cols[2]?.replace(/"/g, '');
      const cpfCnpj = cols[18]?.replace(/"/g, '').replace(/\D/g, '');
      
      if (!cpfCnpj) {
        console.log(`⚠️ SKIPPED: ${name} (No Document)`);
        continue;
      }
      
      try {
        const res = await axios.get("https://api.bling.com.br/Api/v3/contatos", {
          params: { numeroDocumento: cpfCnpj },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.data && res.data.data.length > 0) {
          console.log(`✅ FOUND: ${name} (Doc: ${cpfCnpj}) -> ID: ${res.data.data[0].id}`);
        } else {
          console.log(`❌ NOT FOUND: ${name} (Doc: ${cpfCnpj})`);
        }
      } catch (err: any) {
        console.error(`⚠️ ERROR checking ${name} (Doc: ${cpfCnpj}):`, err.response?.data?.error || err.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
