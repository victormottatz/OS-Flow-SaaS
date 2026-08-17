import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Buscando OS 234813 (Fabíola) ---');

  // Buscar por osNumber contendo '234813' ou por nome da cliente Fabíola
  const osList = await prisma.ordemServico.findMany({
    where: {
      OR: [
        { osNumber: { contains: '234813' } },
        { client: { name: { contains: 'FABIOLA', mode: 'insensitive' } } }
      ]
    },
    include: {
      client: true,
      device: true
    }
  });

  console.log(`Encontradas ${osList.length} Ordens de Serviço:`);
  for (const os of osList) {
    console.log(`- ID: ${os.id} | Número: ${os.osNumber} | Cliente: ${os.client?.name} | Status Atual: ${os.status} | Total: R$ ${os.totalCost}`);
  }

  if (osList.length === 0) {
    console.log('Nenhuma OS encontrada com o número 234813.');
    return;
  }

  // Atualizar o status da OS 234813 para AGUARDANDO_PECA e marcar isReopened = true
  const targetOS = osList.find(os => os.osNumber.includes('234813')) || osList[0];

  console.log(`\nRevertendo status da OS ID: ${targetOS.id} (${targetOS.osNumber})...`);

  const updated = await prisma.ordemServico.update({
    where: { id: targetOS.id },
    data: {
      status: 'AGUARDANDO_PECA',
      isReopened: true,
      financialStatus: 'PENDENTE'
    }
  });

  // Gravar registro na tabela AuditLog
  await prisma.auditLog.create({
    data: {
      entityName: 'OrdemServico',
      entityId: targetOS.id,
      action: 'REVERT_STATUS',
      oldValue: { status: targetOS.status, isReopened: targetOS.isReopened },
      newValue: { status: updated.status, isReopened: updated.isReopened },
      userId: 'SYSTEM_RECEPTION_REQUEST',
      reason: 'Reversão isolada a pedido da Recepção MGV: Cliente Fabíola levou o equipamento enquanto aguarda a peça e possui pagamento parcial pendente.'
    }
  });

  console.log(`✅ SUCESSO! OS ${updated.osNumber} atualizada para status: ${updated.status}`);
}

main()
  .catch(err => {
    console.error('❌ Erro ao atualizar OS:', err);
  })
  .finally(() => prisma.$disconnect());
