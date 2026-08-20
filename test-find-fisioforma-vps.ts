import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:k6k2tHwYChVlRTQg@localhost:5432/postgres?schema=public"
    }
  }
});

async function main() {
  console.log('Searching for latest 20 OS in the VPS DB to find the missing one...');
  
  try {
    const latestOS = await prisma.ordemServico.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        client: true,
        device: true,
      },
    });

    const summary = latestOS.map(os => ({
      osNumber: os.osNumber,
      createdAt: os.createdAt,
      clientName: os.client?.name || "SEM CLIENTE",
      deviceId: os.deviceId,
      deviceBrand: os.deviceBrand || os.device?.brand,
      status: os.status,
    }));

    console.table(summary);
  } catch (error) {
    console.error("Error connecting to VPS:", error.message);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
