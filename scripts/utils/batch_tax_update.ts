import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando rotina de atualização de tributação em lote...");

  // Exemplo de dicionário de Grupos -> Regra
  // Tributado: CFOP 5102/6102, CSOSN 102
  // ST: CFOP 5405/6405, CSOSN 500
  
  const taxRules = {
    TRIBUTADO: {
      cfopIntraEstadual: "5102",
      cfopInterEstadual: "6102",
      cstIcms: "000",
      cstOrigem: "0",
      pisAliq: 0,
      cofinsAliq: 0,
      ipiAliq: 0,
      // CSOSN fica mapeado junto com cstIcms na sua arquitetura ou em campo específico?
      // Pelo schema.prisma, usa-se cstIcms ("000").
    },
    ST: {
      cfopIntraEstadual: "5405",
      cfopInterEstadual: "6404", // ou 6405
      cstIcms: "500", // Para Simples Nacional CSOSN 500
      cstOrigem: "0",
      pisAliq: 0,
      cofinsAliq: 0,
      ipiAliq: 0,
    }
  };

  // Grupos mapeados
  const gruposTributados = ["Telas", "Acessórios", "Serviços"]; // Exemplo
  const gruposST = ["Baterias", "Placas"]; // Exemplo

  console.log(`Atualizando grupos TRIBUTADOS: ${gruposTributados.join(", ")}`);
  for (const grupo of gruposTributados) {
    const result = await prisma.part.updateMany({
      where: { partGroup: grupo },
      data: taxRules.TRIBUTADO
    });
    console.log(`Grupo ${grupo}: ${result.count} registros atualizados.`);
  }

  console.log(`Atualizando grupos ST: ${gruposST.join(", ")}`);
  for (const grupo of gruposST) {
    const result = await prisma.part.updateMany({
      where: { partGroup: grupo },
      data: taxRules.ST
    });
    console.log(`Grupo ${grupo}: ${result.count} registros atualizados.`);
  }

  console.log("Atualização concluída com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
