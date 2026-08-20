import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const osNumber = "234825";
  const os = await prisma.ordemServico.findFirst({
    where: { osNumber: osNumber },
    include: { client: true }
  });

  if (os) {
    console.log("OS Found:");
    console.log(JSON.stringify(os, null, 2));
  } else {
    console.log("OS 234825 NOT FOUND");
    // let's try searching by client name
    const byClient = await prisma.ordemServico.findMany({
      where: {
        client: {
          name: {
            contains: "CARLOS STEFANI",
            mode: "insensitive"
          }
        }
      },
      include: { client: true }
    });
    console.log("Found by client name:", byClient.map(o => ({
      id: o.id,
      osNumber: o.osNumber,
      status: o.status,
      equipment: o.equipment,
      defect: o.defect
    })));
  }
  await prisma.$disconnect();
}
main();
