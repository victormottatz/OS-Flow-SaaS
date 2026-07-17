import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const osList = await prisma.ordemServico.findMany({
    include: { client: true }
  });

  const missing = [
    { num: "23575", name: "CLINICA FRANKLIN", total: 675.00 },
    { num: "23569", name: "MARCOS AURELIO", total: 680.00 },
    { num: "23562", name: "CLINICA MEDICA NEFERTITI", total: 1270.00 },
    { num: "23404", name: "THALLES RODRIGUES", total: 1597.90 },
    { num: "23491", name: "JULIANA PAES", total: 2429.30 },
    { num: "23466", name: "CLINICA ESTETICA FISIOFORMA", total: 1500.00 },
    { num: "23300", name: "MARCIA ESTELA", total: 2031.00 }
  ];

  const idsToUpdate: string[] = [];

  for (const item of missing) {
    let found = osList.find(os => Math.abs(os.totalCost - item.total) < 0.01 && os.client.name.toUpperCase().includes(item.name.split(' ')[0]));
    
    if (!found) {
        // Try just by total cost
        const byTotal = osList.filter(os => Math.abs(os.totalCost - item.total) < 0.01);
        if (byTotal.length === 1) {
            found = byTotal[0];
        } else if (byTotal.length > 1) {
            console.log(`Multiple matches by total for ${item.name}:`);
            byTotal.forEach(m => console.log(`  - ${m.osNumber} (${m.client.name})`));
        }
    }

    // Try just by prefix and approx total cost
    if (!found) {
        found = osList.find(os => os.osNumber.includes(item.num) && Math.abs(os.totalCost - item.total) < 10);
    }
    
    if (found) {
        console.log(`Found ${item.name} -> ${found.osNumber} (${found.client.name}) [Total: ${found.totalCost}]`);
        idsToUpdate.push(found.id);
    } else {
        console.log(`Could not find ${item.name}`);
    }
  }

  if (idsToUpdate.length > 0) {
      const res = await prisma.ordemServico.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { status: 'AGUARDANDO_AUTORIZACAO' }
      });
      console.log(`Updated ${res.count} OSs.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
