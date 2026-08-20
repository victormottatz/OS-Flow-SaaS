import { PrismaClient } from '@prisma/client';

async function check() {
  const p1 = new PrismaClient({ datasourceUrl: 'postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5432/postgres_teste?schema=public' });
  const u1 = await p1.user.count().catch((e) => {
    console.error("5432 Error:", e.message);
    return -1;
  });
  console.log('5432 users:', u1);
  await p1.$disconnect();

  const p2 = new PrismaClient({ datasourceUrl: 'postgresql://postgres:k6k2tHwYChVlRTQg@179.198.121.203:5433/postgres_teste?schema=public' });
  const u2 = await p2.user.count().catch((e) => {
    console.error("5433 Error:", e.message);
    return -1;
  });
  console.log('5433 users:', u2);
  await p2.$disconnect();
}

check();
