import { PrismaClient } from '@prisma/client';

const prodDbUrl = "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres?schema=public";
const testDbUrl = "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres_teste?schema=public";

async function checkDb(url, dbName) {
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  console.log(`\n--- Searching in ${dbName} for OS 235235 ---`);
  
  try {
    const osList = await prisma.ordemServico.findMany({
      where: {
        OR: [
          { osNumber: '235235' },
          { osNumber: 'OS-235235' }
        ]
      },
      include: { client: true, device: true }
    });

    if (osList.length > 0) {
      console.log(`FOUND ${osList.length} OS matching 235235!`);
      const summary = osList.map(os => ({
        osNumber: os.osNumber,
        createdAt: os.createdAt,
        clientName: os.client?.name || "SEM CLIENTE",
        deviceBrand: os.deviceBrand || os.device?.brand,
        status: os.status,
      }));
      console.table(summary);
    } else {
      console.log('No OS found with number 235235 or OS-235235.');
    }
  } catch (error) {
    console.error(`Error querying ${dbName}:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkDb(prodDbUrl, 'PROD LOCAL DB (localhost:5432/postgres)');
  await checkDb(testDbUrl, 'TEST LOCAL DB (localhost:5432/postgres_teste)');
}

main();
