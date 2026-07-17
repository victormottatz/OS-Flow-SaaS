import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const osList = await prisma.ordemServico.findMany({
    include: { client: true }
  });

  const m = osList.filter(o => 
    o.client.name.includes('CLINICA FRANKLIN') || 
    o.client.name.includes('MARCOS AURELIO')
  );

  console.log(m.map(o => o.osNumber + ' - ' + o.client.name + ' - Total: ' + o.totalCost));

  // Find exact
  const c1 = m.find(o => o.client.name.includes('CLINICA FRANKLIN') && Math.abs(o.totalCost - 675) < 0.1);
  const c2 = m.find(o => o.client.name.includes('MARCOS AURELIO') && Math.abs(o.totalCost - 680) < 0.1);

  if (c1) {
    await prisma.ordemServico.update({ where: { id: c1.id }, data: { status: 'AGUARDANDO_AUTORIZACAO' }});
    console.log(`Updated ${c1.osNumber}`);
  }
  if (c2) {
    await prisma.ordemServico.update({ where: { id: c2.id }, data: { status: 'AGUARDANDO_AUTORIZACAO' }});
    console.log(`Updated ${c2.osNumber}`);
  }
}

main().finally(() => prisma.$disconnect());
