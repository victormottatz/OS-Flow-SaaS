import { PrismaClient } from "@prisma/client";
import { buildDocumentPdf } from "../src/services/pdfService";
import { DOCUMENT_TEMPLATES } from "../src/config/documents.config";
import { tenantService } from "../src/services/tenant.service";

const prisma = new PrismaClient();

async function runPhase2Validation() {
  console.log("=================================================");
  console.log("🧪 INICIANDO TESTE DE VALIDAÇÃO SAAS - FASE 2");
  console.log("=================================================");

  try {
    // 1. Cria assistência parceira de teste
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const testEmail = `dono_fase2_${Date.now()}@esteticapro.com.br`;
    console.log("\n[1/3] Registrando assistência técnica parceira...");
    const tenant = await tenantService.registerTenant({
      companyName: `Laser & Estética Pro ${randomSuffix}`,
      cnpj: `98.${randomSuffix}.432/0001-10`,
      city: "Ribeirão Preto",
      state: "SP",
      phone: "16999991234",
      ownerName: "Dra. Beatriz Santos",
      ownerEmail: testEmail,
      ownerPassword: "SenhaSegura@2026"
    });

    console.log(`✅ Tenant criado: ${tenant.company.name} (${tenant.company.id})`);

    // 2. Simula criação de OS vinculada ao Tenant
    console.log("\n[2/3] Criando OS vinculada à assistência parceira...");
    const client = await prisma.client.create({
      data: {
        name: "Clínica de Estética Bella Donna",
        cpfCnpj: "11.222.333/0001-44",
        phone: "16988887777",
        email: "contato@belladonna.com.br",
        address: "Av. Independência, 1200",
        city: "Ribeirão Preto",
        state: "SP",
        companyId: tenant.company.id
      }
    });

    const device = await prisma.device.create({
      data: {
        clientId: client.id,
        type: "Laser de Diodo",
        brand: "Milesman",
        model: "Compact 810nm",
        serialNumber: "MM-2024-8890",
        description: "Manípulo com vazamento de água no conector e alarme de fluxo de água",
        companyId: tenant.company.id
      }
    });

    const osNumber = `OS-PRO-${Math.floor(1000 + Math.random() * 9000)}`;
    const os = await prisma.ordemServico.create({
      data: {
        osNumber,
        client: { connect: { id: client.id } },
        device: { connect: { id: device.id } },
        company: { connect: { id: tenant.company.id } },
        status: "EM_MANUTENCAO",
        reportedDefect: "Manípulo superaquecendo após 500 disparos",
        diagnostic: "Troca do acoplamento de engate rápido e recarga de fluído deionizado",
        laborCost: 1200.0,
        totalCost: 1650.0,
        billingStatus: "PENDENTE"
      },
      include: { client: true, device: true, company: true }
    });

    console.log(`✅ OS criada com sucesso: ${os.osNumber} para ${os.client?.name}`);

    // 3. Teste de Geração de Laudo / PDF White-Label
    console.log("\n[3/3] Gerando Laudo/Orçamento em PDF White-label com os dados da parceira...");
    const template = DOCUMENT_TEMPLATES.orcamento;
    const companyInfo = {
      razaoSocial: tenant.company.name,
      cnpj: `CNPJ: ${tenant.company.cnpj}`,
      endereco: `${tenant.company.city} - ${tenant.company.state}`,
      phone: tenant.company.phone || ""
    };

    const pdfBuffer = await buildDocumentPdf(template, os as any, new Date().toISOString(), companyInfo);
    console.log(`✅ PDF gerado com sucesso! Tamanho do arquivo: ${pdfBuffer.length} bytes.`);

    console.log("\n=================================================");
    console.log("🎉 TODAS AS VALIDAÇÕES DA FASE 2 PASSARAM COM SUCESSO!");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ ERRO NA VALIDAÇÃO DA FASE 2:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase2Validation();
