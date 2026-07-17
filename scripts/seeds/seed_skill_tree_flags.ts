import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const flagsToSeed = [
  {
    key: "WHATSAPP_AUTO_MESSAGES",
    value: false,
    description: "Habilita o envio automático de WhatsApp para mudança de status, orçamento pronto e lembretes de retirada, além do histórico de mensagens."
  },
  {
    key: "FISCAL_NFE_EMISSION",
    value: false,
    description: "Habilita a emissão automática de NFe/NFCe, importação de notas de compra e sincronização de clientes e produtos com o Bling."
  },
  {
    key: "FINANCIAL_DASHBOARD",
    value: false,
    description: "Habilita o Dashboard Financeiro completo, gráficos de lucro líquido, lucratividade consolidada e ranking de técnicos."
  },
  {
    key: "STOCK_RESERVATION",
    value: false,
    description: "Habilita a reserva automática de peças ao iniciar manutenção/orçamento, alertas de estoque mínimo e sugestões de compra."
  },
  {
    key: "STRESS_TEST_FLOW",
    value: false,
    description: "Habilita o cronômetro inteligente para testes de estresse de 30 minutos na bancada e travas no Kanban do técnico."
  },
  {
    key: "MANDATORY_CHECKLIST",
    value: false,
    description: "Habilita a exigência de preenchimento do checklist de entrada padronizado e laudo com fotos do equipamento."
  },
  {
    key: "CLIENT_PORTAL",
    value: false,
    description: "Habilita o Portal Público do Cliente com timeline de reparo, fotos de laudo, download de documentos e aprovação de orçamento online."
  },
  {
    key: "AUTOMATIONS_AND_ALERTS",
    value: false,
    description: "Habilita a automação de tarefas, alertas inteligentes de ociosidade, fechamento automático de OS e agendamentos de revisões."
  },
  {
    key: "INTELLIGENCE_ARTIFICIAL_DIAG",
    value: false,
    description: "Habilita recursos de Inteligência Artificial para sugestão de diagnósticos, análise automática de fotos e previsões de estoque."
  }
];

async function main() {
  console.log("Iniciando semeadura das Feature Flags da Skill Tree...");

  for (const flag of flagsToSeed) {
    const existing = await prisma.featureFlag.findUnique({
      where: { key: flag.key }
    });

    if (existing) {
      console.log(`[Seed] Feature Flag '${flag.key}' já existe. Valor atual: ${existing.value}`);
    } else {
      await prisma.featureFlag.create({
        data: flag
      });
      console.log(`[Seed] Feature Flag '${flag.key}' cadastrada com sucesso!`);
    }
  }

  console.log("Semeadura concluída!");
}

main()
  .catch((e) => {
    console.error("Erro ao semear Feature Flags:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
