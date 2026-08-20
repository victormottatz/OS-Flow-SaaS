import prisma from "./src/database/prisma";

async function find() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" }
  });
  console.log("Clientes cadastrados:");
  for (const c of clients) {
    console.log(`- ${c.name} | CPF/CNPJ: ${c.cpfCnpj || "N/A"} | ID: ${c.id}`);
  }
  await prisma.$disconnect();
}
find();
