import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const keys = Object.keys(prisma);
console.log("PrismaClient keys:", keys.filter(k => !k.startsWith("$") && !k.startsWith("_")));
await prisma.$disconnect();
