import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const finalOSsToUpdate = [
  "OS-235754", // CLINICA FRANKLIN
  "OS-235690", // MARCOS AURELIO
  "OS-235062", // NEFERTITI
  "OS-234904", // THALLES RODRIGUES
  "OS-234691"  // JULIANA PAES
];

async function main() {
  const osList = await prisma.ordemServico.findMany({
    where: {
      osNumber: { in: finalOSsToUpdate }
    },
    include: { client: true }
  });

  console.log(`Found ${osList.length} OSs to update:`);
  osList.forEach(os => console.log(`- ${os.osNumber} (${os.client.name})`));

  const res = await prisma.ordemServico.updateMany({
    where: {
      osNumber: { in: finalOSsToUpdate }
    },
    data: {
      status: 'AGUARDANDO_AUTORIZACAO'
    }
  });

  console.log(`Updated ${res.count} OSs to AGUARDANDO_AUTORIZACAO.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
