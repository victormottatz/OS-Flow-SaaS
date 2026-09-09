import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando script de migração e vínculo da Empresa Padrão (SaaS)...');

  // 1. Cria ou recupera a empresa piloto/matriz
  let defaultCompany = await prisma.company.findFirst({
    where: { slug: 'oficina-piloto' }
  });

  if (!defaultCompany) {
    defaultCompany = await prisma.company.create({
      data: {
        name: 'Oficina Piloto (Matriz)',
        slug: 'oficina-piloto',
        active: true
      }
    });
    console.log(`✅ Empresa padrão criada com sucesso: ID = ${defaultCompany.id} (${defaultCompany.name})`);
  } else {
    console.log(`ℹ️ Empresa padrão já existia: ID = ${defaultCompany.id} (${defaultCompany.name})`);
  }

  const companyId = defaultCompany.id;

  // 2. Atualiza os registros órfãos em cada tabela
  const updateUsers = await prisma.user.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`👤 Usuários vinculados: ${updateUsers.count}`);

  const updateClients = await prisma.client.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`👥 Clientes vinculados: ${updateClients.count}`);

  const updateDevices = await prisma.device.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`📱 Equipamentos vinculados: ${updateDevices.count}`);

  const updateParts = await prisma.part.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`⚙️ Peças em estoque vinculadas: ${updateParts.count}`);

  const updateOrders = await prisma.ordemServico.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`📋 Ordens de Serviço vinculadas: ${updateOrders.count}`);

  const updateBling = await prisma.blingConfig.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`🔗 Configurações do Bling vinculadas: ${updateBling.count}`);

  const updateTags = await prisma.tag.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`🏷️ Tags vinculadas: ${updateTags.count}`);

  const updateOfficeSettings = await prisma.officeSetting.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`⚙️ Configurações da oficina vinculadas: ${updateOfficeSettings.count}`);

  const updateSuppliers = await prisma.supplier.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`🚚 Fornecedores vinculados: ${updateSuppliers.count}`);

  const updateCustomFields = await prisma.customField.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`📝 Campos customizados vinculados: ${updateCustomFields.count}`);

  const updateChats = await prisma.whatsappChat.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`💬 Chats de WhatsApp vinculados: ${updateChats.count}`);

  const updateAuditLogs = await prisma.auditLog.updateMany({
    where: { companyId: null },
    data: { companyId }
  });
  console.log(`📜 Logs de auditoria vinculados: ${updateAuditLogs.count}`);

  console.log('\n🎉 Migração e vínculo de dados legados com a Empresa Padrão concluídos com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
