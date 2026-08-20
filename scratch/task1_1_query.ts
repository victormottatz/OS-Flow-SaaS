import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Auditoria de Dados (Fase 1 - Task 1.1) ---');

  // 1. OS finalizadas mas com faturamento pendente
  const faturamentoPendente = await prisma.ordemServico.count({
    where: {
      status: 'FINALIZADO',
      billingStatus: 'PENDENTE'
    }
  });

  // 2. OS finalizadas mas sem checklist de saída
  const osFinalizadas = await prisma.ordemServico.findMany({
    where: { status: 'FINALIZADO' },
    select: { osNumber: true, checklistSaida: true }
  });
  
  let semChecklist = 0;
  for (const os of osFinalizadas) {
    if (!os.checklistSaida || (Array.isArray(os.checklistSaida) && os.checklistSaida.length === 0)) {
      semChecklist++;
    }
  }

  // 3. OS travadas em orcamento ou avaliacao antigas (> 30 dias)
  const dataCorte = new Date();
  dataCorte.setDate(dataCorte.getDate() - 30);
  
  const osTravadas = await prisma.ordemServico.count({
    where: {
      status: { in: ['AGUARDANDO_AVALIACAO', 'AGUARDANDO_AUTORIZACAO', 'ORCAMENTO'] },
      createdAt: { lt: dataCorte }
    }
  });

  console.log(`- OS Finalizadas com Faturamento Pendente: ${faturamentoPendente}`);
  console.log(`- OS Finalizadas sem Checklist de Saída: ${semChecklist} (Bypass de validação antigo)`);
  console.log(`- OS Travadas (Aguardando > 30 dias): ${osTravadas}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
