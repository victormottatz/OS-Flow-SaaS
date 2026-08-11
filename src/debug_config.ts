import prisma from "./database/prisma";

async function main() {
  const setting = await prisma.officeSetting.findUnique({
    where: { key: "OS_ALLOWED_TRANSITIONS" }
  });
  console.log("OS_ALLOWED_TRANSITIONS setting:", setting);
}

main().catch(console.error).finally(() => prisma.$disconnect());
