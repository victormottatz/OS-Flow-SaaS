import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const todayStart = new Date('2026-08-11T00:00:00.000Z');
  const todayEnd = new Date('2026-08-11T23:59:59.999Z');

  console.log('Searching for OS from client "Fisioforma" created today...');
  
  let osList = await prisma.ordemServico.findMany({
    where: {
      client: {
        name: {
          contains: 'Fisioforma',
          mode: 'insensitive',
        },
      },
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      client: true,
      device: true,
    },
  });

  if (osList.length === 0) {
      console.log('No OS found today. Searching for any recent OS from "Fisioforma"...');
      osList = await prisma.ordemServico.findMany({
        where: {
          client: {
            name: {
              contains: 'Fisioforma',
              mode: 'insensitive',
            },
          },
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        include: {
          client: true,
          device: true,
        },
      });
  }

  console.log(JSON.stringify(osList, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
