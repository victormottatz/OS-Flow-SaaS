import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const flagKey = "OS_PROFITABILITY_CALC";
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
      description: "Habilita o módulo de Rentabilidade por OS (Custo vs Lucro) e modal gerencial para o perfil OWNER."
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
