import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'blingContactId'")
  .then((r: any) => { console.log('Column exists:', JSON.stringify(r)); })
  .catch((e: any) => { console.error('Error:', e.message); })
  .finally(() => { (p as any)['$disconnect'](); });
