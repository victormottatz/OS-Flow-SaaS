import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const os = await prisma.ordemServico.findFirst({
    where: { osNumber: "OS-235179" },
  });
  if (os) {
    console.log("OS UUID:", os.id);
  } else {
    console.log("Not found");
  }
  await prisma.$disconnect();
}
main();
