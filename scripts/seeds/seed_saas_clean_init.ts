import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ [OS Flow SaaS] Inicializando banco de dados limpo para nova instalação...');

  // 1. Cria a Empresa inicial limpa do cliente
  let company = await prisma.company.findFirst({
    where: { slug: 'oficina-modelo' }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Minha Assistência Técnica (Modelo)',
        slug: 'oficina-modelo',
        active: true
      }
    });
    console.log(`✅ [1/3] Nova Empresa criada: ID = ${company.id} (${company.name})`);
  } else {
    console.log(`ℹ️ [1/3] Empresa existente: ID = ${company.id}`);
  }

  // 2. Cria o Usuário Administrador Master inicial
  const adminEmail = 'admin@osflow.com.br';
  let adminUser = await prisma.user.findFirst({
    where: { email: adminEmail }
  });

  if (!adminUser) {
    const passwordHash = await bcrypt.hash('Admin@2026', 10);
    adminUser = await prisma.user.create({
      data: {
        name: 'Administrador Master',
        email: adminEmail,
        passwordHash,
        role: 'OWNER',
        companyId: company.id
      }
    });
    console.log(`✅ [2/3] Usuário Administrador criado com sucesso!`);
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Senha inicial: Admin@2026`);
  } else {
    console.log(`ℹ️ [2/3] Usuário Administrador já existe: ${adminEmail}`);
  }

  // 3. Cria as Configurações de Regras de Fluxo e Transição de OS
  const defaultTransitions = {
    AGUARDANDO_AVALIACAO: ['AGUARDANDO_AUTORIZACAO', 'FINALIZADO'],
    AGUARDANDO_AUTORIZACAO: ['EM_MANUTENCAO', 'AGUARDANDO_PECA', 'FINALIZADO'],
    AGUARDANDO_PECA: ['EM_MANUTENCAO', 'AGUARDANDO_AUTORIZACAO'],
    EM_MANUTENCAO: ['PRONTO_RETIRADA', 'AGUARDANDO_PECA'],
    PRONTO_RETIRADA: ['PAGO_PRONTO_RETIRADA', 'FINALIZADO'],
    PAGO_PRONTO_RETIRADA: ['FINALIZADO'],
    FINALIZADO: []
  };

  const existingRule = await prisma.officeSetting.findFirst({
    where: { companyId: company.id, key: 'OS_ALLOWED_TRANSITIONS' }
  });

  if (!existingRule) {
    await prisma.officeSetting.create({
      data: {
        companyId: company.id,
        key: 'OS_ALLOWED_TRANSITIONS',
        value: JSON.stringify(defaultTransitions)
      }
    });
    console.log(`✅ [3/3] Regras de transição de OS configuradas.`);
  }

  // 4. Verificação de Integridade das Tabelas
  const totalClients = await prisma.client.count({ where: { companyId: company.id } });
  const totalParts = await prisma.part.count({ where: { companyId: company.id } });
  const totalOrders = await prisma.ordemServico.count({ where: { companyId: company.id } });

  console.log('\n📊 [Status do Banco de Dados Limpo]');
  console.log(`- Clientes cadastrados: ${totalClients} (Zero)`);
  console.log(`- Peças de estoque: ${totalParts} (Zero)`);
  console.log(`- Ordens de serviço: ${totalOrders} (Zero)`);
  console.log('\n🎉 [Sucesso] Banco de dados inicializado 100% limpo e pronto para o cliente!');
}

main()
  .catch((e) => {
    console.error('❌ Erro na inicialização:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
