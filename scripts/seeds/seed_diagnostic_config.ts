import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const key = "DIAGNOSTIC_REQUIRED_PRONTO_RETIRADA";
  const existing = await prisma.officeSetting.findUnique({
    where: { key }
  });

  if (existing) {
    console.log(`[Seed] Configuração '${key}' já existe com o valor: ${existing.value}`);
    return;
  }

  await prisma.officeSetting.create({
    data: {
      key,
      value: "true",
      category: "GERAL",
      type: "boolean",
      description: "Exigir preenchimento do laudo técnico (diagnóstico) antes de mover a OS para Pronto Retirada."
    }
  });

  console.log(`[Seed] Configuração '${key}' semeada com sucesso (Padrão: true).`);
}

main()
  .catch((e) => {
    console.error("Erro ao semear configuração de diagnóstico:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
