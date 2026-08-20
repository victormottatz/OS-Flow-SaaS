import { PrismaClient } from '@prisma/client';
import { syncClientToBling } from './src/services/bling';

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findUnique({
    where: { id: '2cc7ad8f-1719-4bce-a907-a7427007dbb6' }
  });

  if (!client) {
    console.error('Client not found');
    process.exit(1);
  }

  console.log('Client found:', {
    name: client.name,
    cpfCnpj: client.cpfCnpj,
    phone: client.phone,
    email: client.email,
    address: client.address,
  });

  const blingId = await syncClientToBling({
    name: client.name,
    cpfCnpj: client.cpfCnpj || '',
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    rg: client.rg || undefined,
  });

  console.log(`\n✅ SUCCESS! Bling Contact ID: ${blingId}`);
}

main()
  .catch((e) => {
    console.error('❌ ERROR:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma['$disconnect']();
  });
