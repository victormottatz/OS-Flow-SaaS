import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultTransitions = [
  { from: "AGUARDANDO_AVALIACAO", to: "AGUARDANDO_AUTORIZACAO" },
  { from: "AGUARDANDO_AVALIACAO", to: "FINALIZADO" },
  { from: "AGUARDANDO_AUTORIZACAO", to: "EM_MANUTENCAO" },
  { from: "AGUARDANDO_AUTORIZACAO", to: "AGUARDANDO_PECA" },
  { from: "AGUARDANDO_AUTORIZACAO", to: "FINALIZADO" },
  { from: "AGUARDANDO_PECA", to: "EM_MANUTENCAO" },
  { from: "EM_MANUTENCAO", to: "AGUARDANDO_PECA" },
  { from: "EM_MANUTENCAO", to: "PRONTO_RETIRADA" },
  { from: "PRONTO_RETIRADA", to: "FINALIZADO" },
  { from: "PRONTO_RETIRADA", to: "PAGO_PRONTO_RETIRADA" },
  { from: "PAGO_PRONTO_RETIRADA", to: "FINALIZADO" },
  { from: "PRONTO_RETIRADA", to: "EM_MANUTENCAO" },
  { from: "FINALIZADO", to: "EM_MANUTENCAO" },
  { from: "FINALIZADO", to: "AGUARDANDO_AVALIACAO" }
];

async function main() {
  const key = "OS_ALLOWED_TRANSITIONS";
  const existing = await prisma.officeSetting.findUnique({
    where: { key }
  });

  if (existing) {
    console.log(`[Seed] Configuração '${key}' já existe.`);
    return;
  }

  await prisma.officeSetting.create({
    data: {
      key,
      value: JSON.stringify(defaultTransitions, null, 2),
      category: "GERAL",
      type: "json",
      description: "Lista de transições de status permitidas para as Ordens de Serviço."
    }
  });

  console.log(`[Seed] Configuração '${key}' semeada com sucesso com as transições padrão.`);
}

main()
  .catch((e) => {
    console.error("Erro ao semear transições de status:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
