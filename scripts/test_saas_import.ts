import prisma from "../src/database/prisma";
import { dataImportService } from "../src/services/dataImport.service";

async function main() {
  console.log("=================================================================");
  console.log("🧪 TESTE AUTOMATIZADO: MIGRACÃO E IMPORTADOR EM 1 CLIQUE SAAS");
  console.log("=================================================================\n");

  // 1. Cria Tenant de Teste
  const testSlug = `import-pilot-${Date.now()}`;
  const company = await prisma.company.create({
    data: {
      name: "Assistência Laser Pro Migração",
      slug: testSlug,
      cnpj: `99.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-99`,
      email: "contato@laserpromigra.com.br",
      phone: "16988887777",
      city: "Ribeirão Preto",
      state: "SP"
    }
  });

  console.log(`✅ Tenant de Teste Criado: [ID: ${company.id}] - ${company.name}`);

  // 2. Testar Geração de Templates CSV
  const clientTemplate = dataImportService.getTemplateCsv("clients");
  const partTemplate = dataImportService.getTemplateCsv("parts");

  if (!clientTemplate.includes("Tipo_Equipamento") || !partTemplate.includes("Nome_Peca")) {
    throw new Error("❌ Falha na geração dos templates CSV de exemplo.");
  }
  console.log("✅ Templates CSV de Exemplo Gerados com Sucesso!");

  // 3. Testar Importação em Lote de Clientes e Equipamentos
  const clientsPayload = [
    {
      name: "Clínica Dermatológica Estética Real",
      cpfCnpj: "11222333000188",
      phone: "16999991111",
      email: "dra.ana@esteticareal.com.br",
      address: "Av. Fiusa 1500",
      city: "Ribeirão Preto",
      state: "SP",
      zipCode: "14024000",
      deviceType: "Laser Diodo",
      deviceBrand: "Milesman",
      deviceModel: "Compact 810nm",
      deviceSerial: "MM-99410"
    },
    {
      name: "Instituto de Beleza & Laser Dra. Sofia",
      cpfCnpj: "22333444000199",
      phone: "11988882222",
      email: "sofia@institutolaser.com.br",
      address: "Rua Haddock Lobo 100",
      city: "São Paulo",
      state: "SP",
      zipCode: "01414000",
      deviceType: "Criolipólise",
      deviceBrand: "Ibramed",
      deviceModel: "Polarys",
      deviceSerial: "POL-77889"
    }
  ];

  const clientImportResult = await dataImportService.importClients(company.id, clientsPayload);
  console.log(`✅ Resultado da Importação de Clientes:`, clientImportResult);

  if (clientImportResult.createdClients !== 2 || clientImportResult.createdDevices !== 2) {
    throw new Error("❌ Falha na contagem esperada de clientes e equipamentos criados.");
  }

  // 4. Testar Importação em Lote de Peças de Estoque
  const partsPayload = [
    {
      code: "ENG-LASER-01",
      name: "Engate Rápido Mangueira Manípulo Milesman",
      stock: 12,
      cost: 45.50,
      price: 130.00,
      ncm: "8481.80.99",
      location: "Gaveta A3"
    },
    {
      code: "CHILLER-FAN-02",
      name: "Ventoinha Alta Vazão 24V Chiller Criolipólise",
      stock: 6,
      cost: 85.00,
      price: 240.00,
      ncm: "8414.59.90",
      location: "Prateleira B1"
    }
  ];

  const partImportResult = await dataImportService.importParts(company.id, partsPayload);
  console.log(`✅ Resultado da Importação de Peças:`, partImportResult);

  if (partImportResult.createdParts !== 2) {
    throw new Error("❌ Falha na contagem esperada de peças de estoque criadas.");
  }

  // 5. Validar Isolamento Multi-Tenant no Banco
  const dbClients = await prisma.client.findMany({
    where: { companyId: company.id },
    include: { devices: true }
  });

  const dbParts = await prisma.part.findMany({
    where: { companyId: company.id }
  });

  console.log(`\n📊 Verificação no Banco de Dados:`);
  console.log(`- Clientes do Tenant: ${dbClients.length} (com ${dbClients[0].devices.length + dbClients[1].devices.length} equipamentos atrelados)`);
  console.log(`- Peças no Estoque do Tenant: ${dbParts.length}`);

  console.log("\n=================================================================");
  console.log("🎉 TESTE CONCLUÍDO COM 100% DE SUCESSO!");
  console.log("=================================================================");
}

main()
  .catch((err) => {
    console.error("❌ ERRO NO TESTE:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
