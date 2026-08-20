import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const os = await prisma.ordemServico.findFirst({
    where: { status: "FINALIZADO" },
    include: { client: true },
    orderBy: { createdAt: "desc" }
  });
  if (os) {
    console.log("OS:", os.osNumber);
    console.log("Client:", (os as any).client?.name);
    console.log("Client ID:", (os as any).clientId);
    console.log("Status:", os.status);
  } else {
    console.log("No finalized OS found. Trying any...");
    const anyOs = await prisma.ordemServico.findFirst({
      include: { client: true },
      orderBy: { createdAt: "desc" }
    });
    if (anyOs) {
      console.log("OS:", anyOs.osNumber);
      console.log("Client:", (anyOs as any).client?.name);
      console.log("Client ID:", (anyOs as any).clientId);
      console.log("Status:", anyOs.status);
    }
  }
  await prisma.$disconnect();
}
main();
