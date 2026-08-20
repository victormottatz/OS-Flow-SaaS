import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const osId = 'd8e279f2-416c-4b80-b8b3-6625dbced836';
  
  const updatedOs = await prisma.ordemServico.update({
    where: { id: osId },
    data: {
      diagnostic: "Foi detectado que o equipamento precisava de uma atualização de software. O procedimento foi realizado com sucesso durante a revisão geral e o aparelho segue funcionando corretamente.",
      laudoMacro: "Aparelho passou por uma atualização de software e revisão geral, estando agora funcionando corretamente."
    }
  });

  // Também criar um AuditLog simulando a mudança se quisermos, mas o Prisma não faz isso automaticamente a menos que haja trigger/middleware.
  await prisma.auditLog.create({
    data: {
      entityName: 'OrdemServico',
      entityId: osId,
      action: 'UPDATE',
      userId: 'system-agent',
      reason: 'Ajuste solicitado via assistente - alterado para atualização de software',
      oldValue: JSON.stringify({ 
        diagnostic: "Aparelho não apresentou nenhum defeito durante testes realizados, foi feito uma revisão geral e segue funcionando corretamente.",
        laudoMacro: "Aparelho passou por uma revisão geral no qual segue funcionando corretamente."
      }),
      newValue: JSON.stringify({
        diagnostic: updatedOs.diagnostic,
        laudoMacro: updatedOs.laudoMacro
      })
    }
  });

  console.log('OS atualizada com sucesso no banco de testes!');
  console.log('Novo Diagnóstico:', updatedOs.diagnostic);
  console.log('Novo Laudo Comercial:', updatedOs.laudoMacro);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
