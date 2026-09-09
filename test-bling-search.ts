import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function getAccessToken(): Promise<string | null> {
  const config = await prisma.blingConfig.findFirst();
  if (!config?.accessToken) return null;
  
  if (config.expiresAt && new Date(config.expiresAt) > new Date()) {
    return config.accessToken;
  }
  
  // Try refresh
  if (!config.refreshToken || !process.env.BLING_CLIENT_ID || !process.env.BLING_CLIENT_SECRET) {
    return null;
  }
  
  const credentials = Buffer.from(`${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`).toString('base64');
  
  const response = await axios.post('https://api.bling.com.br/Api/v3/oauth/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-urlencoded',
        Authorization: `Basic ${credentials}`,
        'enable-jwt': '1',
      },
    }
  );
  
  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + (expires_in - 60) * 1000);
  
  await prisma.blingConfig.update({
    where: { id: config.id },
    data: { accessToken: access_token, refreshToken: refresh_token, expiresAt },
  });
  
  return access_token;
}

async function main() {
  const token = await getAccessToken();
  if (!token) {
    console.error('No valid token');
    process.exit(1);
  }
  
  const cpf = '31545697825';
  
  // Test 1: Search by cpfCnpj
  console.log('\n--- Test 1: Search by cpfCnpj param ---');
  try {
    const r1 = await axios.get('https://api.bling.com.br/Api/v3/contatos', {
      params: { cpfCnpj: cpf, limite: 10 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', JSON.stringify(r1.data?.data?.length || 0));
    if (r1.data?.data?.length > 0) {
      console.log('First result:', JSON.stringify(r1.data.data[0], null, 2));
    }
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }

  // Test 2: Search by cnpj param
  console.log('\n--- Test 2: Search by cnpj param ---');
  try {
    const r2 = await axios.get('https://api.bling.com.br/Api/v3/contatos', {
      params: { cnpj: cpf, limite: 10 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', JSON.stringify(r2.data?.data?.length || 0));
    if (r2.data?.data?.length > 0) {
      console.log('First result:', JSON.stringify(r2.data.data[0], null, 2));
    }
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }

  // Test 3: Search by name
  console.log('\n--- Test 3: Search by name ---');
  try {
    const r3 = await axios.get('https://api.bling.com.br/Api/v3/contatos', {
      params: { nome: 'MARILIA FERNANDA GARCIA PINTON', limite: 50 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', JSON.stringify(r3.data?.data?.length || 0));
    if (r3.data?.data?.length > 0) {
      for (const c of r3.data.data) {
        console.log(`  - ID=${c.id}, Nome=${c.nome}, CPF=${c.cpfCnpj || c.cnpj}, Tipo=${c.tipo}`);
      }
    }
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }

  // Test 4: Search by name partial
  console.log('\n--- Test 4: Search by partial name ---');
  try {
    const r4 = await axios.get('https://api.bling.com.br/Api/v3/contatos', {
      params: { nome: 'MARILIA FERNANDA', limite: 50 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Results:', JSON.stringify(r4.data?.data?.length || 0));
    if (r4.data?.data?.length > 0) {
      for (const c of r4.data.data) {
        console.log(`  - ID=${c.id}, Nome=${c.nome}, CPF=${c.cpfCnpj || c.cnpj}, Tipo=${c.tipo}`);
      }
    }
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }

  // Test 5: List all contacts (first page)
  console.log('\n--- Test 5: List all contacts (first 50) ---');
  try {
    const r5 = await axios.get('https://api.bling.com.br/Api/v3/contatos', {
      params: { limite: 50, pagina: 1 },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Total contacts returned:', r5.data?.data?.length || 0);
    const marilia = r5.data?.data?.filter((c: any) => c.nome?.includes('MARILIA'));
    if (marilia?.length > 0) {
      console.log('MARILIA contacts found:');
      for (const c of marilia) {
        console.log(`  - ID=${c.id}, Nome=${c.nome}, CPF=${c.cpfCnpj || c.cnpj}, Tipo=${c.tipo}`);
      }
    } else {
      console.log('No MARILIA contacts found in first page');
    }
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma['$disconnect']());
