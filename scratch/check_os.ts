import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const osId = 'd8e279f2-416c-4b80-b8b3-6625dbced836';
  const customFields = await prisma.customFieldValue.findMany({
    where: { entityId: osId },
    include: { customField: true }
  });
  console.log('Custom Fields for OS:', JSON.stringify(customFields, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
