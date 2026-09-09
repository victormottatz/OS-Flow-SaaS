import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️ [OS Flow SaaS] Iniciando limpeza total do banco de dados (Reset para Estado Vazio)...');

  // 1. Limpeza em cascata / ordem de dependência
  console.log('🧹 [1/4] Removendo Ordens de Serviço, Mensagens e Logs...');
  await prisma.whatsappMessage.deleteMany({});
  await prisma.whatsappChat.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.ordemServico.deleteMany({});

  console.log('🧹 [2/4] Removendo Dispositivos, Clientes e Peças de Estoque...');
  await prisma.device.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.part.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.customField.deleteMany({});
  await prisma.blingConfig.deleteMany({});
  await prisma.officeSetting.deleteMany({});

  console.log('🧹 [3/4] Removendo Usuários e Empresas antigas...');
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // 2. Criação da Empresa Limpa Padrão
  console.log('✨ [4/4] Provisionando Empresa e Administrador Master iniciais...');
  const company = await prisma.company.create({
    data: {
      name: 'Oficina Modelo (SaaS)',
      slug: 'oficina-modelo',
      active: true
    }
  });

  const passwordHash = await bcrypt.hash('Admin@2026', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador Master',
      email: 'admin@osflow.com.br',
      passwordHash,
      role: 'OWNER',
      companyId: company.id
    }
  });

  // 3. Regras de Transição de OS
  const defaultTransitions = {
    AGUARDANDO_AVALIACAO: ['AGUARDANDO_AUTORIZACAO', 'FINALIZADO'],
    AGUARDANDO_AUTORIZACAO: ['EM_MANUTENCAO', 'AGUARDANDO_PECA', 'FINALIZADO'],
    AGUARDANDO_PECA: ['EM_MANUTENCAO', 'AGUARDANDO_AUTORIZACAO'],
    EM_MANUTENCAO: ['PRONTO_RETIRADA', 'AGUARDANDO_PECA'],
    PRONTO_RETIRADA: ['PAGO_PRONTO_RETIRADA', 'FINALIZADO'],
    PAGO_PRONTO_RETIRADA: ['FINALIZADO'],
    FINALIZADO: []
  };

  await prisma.officeSetting.create({
    data: {
      companyId: company.id,
      key: 'OS_ALLOWED_TRANSITIONS',
      value: JSON.stringify(defaultTransitions)
    }
  });

  // 4. Verificação de Contagem
  const totalCompanies = await prisma.company.count();
  const totalUsers = await prisma.user.count();
  const totalClients = await prisma.client.count();
  const totalDevices = await prisma.device.count();
  const totalParts = await prisma.part.count();
  const totalOrders = await prisma.ordemServico.count();
  const totalChats = await prisma.whatsappChat.count();

  console.log('\n=========================================');
  console.log('📊 STATUS FINAL DO BANCO DE DADOS:');
  console.log(`- Empresas: ${totalCompanies} (${company.name})`);
  console.log(`- Usuários: ${totalUsers} (${adminUser.email})`);
  console.log(`- Clientes: ${totalClients} (VAZIO ✓)`);
  console.log(`- Equipamentos: ${totalDevices} (VAZIO ✓)`);
  console.log(`- Peças de Estoque: ${totalParts} (VAZIO ✓)`);
  console.log(`- Ordens de Serviço: ${totalOrders} (VAZIO ✓)`);
  console.log(`- Histórico WhatsApp: ${totalChats} (VAZIO ✓)`);
  console.log('=========================================');
  console.log('🎉 SISTEMA 100% LIMPO E PRONTO PARA SER PREENCHIDO DO ZERO!');
  console.log('🔑 Credenciais de Acesso: admin@osflow.com.br | Senha: Admin@2026');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a limpeza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
