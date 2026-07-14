import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const flagKey = "CLIENT_360_AND_BASE_INSTALADA";
  const existing = await prisma.featureFlag.findUnique({
    where: { key: flagKey }
  });

  if (existing) {
    console.log(`[Seed] Feature Flag '${flagKey}' já existe com o valor: ${existing.value}`);
    return;
  }

  await prisma.featureFlag.create({
    data: {
      key: flagKey,
      value: false,
      description: "Habilita a Data Table de clientes, Visão 360º em drawer, motor de recorrência e o onboarding progressivo de ativos legados (Lazy Loading)."
    }
  });

  console.log(`[Seed] Feature Flag '${flagKey}' semeada com sucesso (Padrão: false).`);
}

main()
  .catch((e) => {
    console.error("Erro ao semear Feature Flags:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
