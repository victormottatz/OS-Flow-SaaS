import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst({
    where: { email: "victor.hugo@mgvrp.com.br" }
  });
  console.log("User:", user ? "FOUND" : "NOT FOUND");
  if (user) console.log(user);
}
run().finally(() => prisma.$disconnect());
