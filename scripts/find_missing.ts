import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const unfoundNames = [
  "CLINICA FRANKLIN",
  "MARCOS AURELIO",
  "NEFERTITI",
  "THALLES RODRIGUES",
  "JULIANA PAES",
  "FISIOFORMA",
  "MARCIA ESTELA"
];

async function main() {
  const osList = await prisma.ordemServico.findMany({
    include: { client: true }
  });

  for (const name of unfoundNames) {
    const matches = osList.filter(os => os.client.name.toUpperCase().includes(name.toUpperCase()));
    console.log(`\nMatches for ${name}:`);
    matches.forEach(m => console.log(`  - ${m.osNumber} (${m.client.name}) - Total: ${m.totalCost} - Status: ${m.status}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
