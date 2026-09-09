import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const parts = await prisma.part.findMany({ where: { deletedAt: null } });
  const withoutNcm = parts.filter(p => !p.ncm || p.ncm.replace(/\D/g, '').length !== 8);
  console.log('=== STATUS DOS NCMS NO BANCO DE DADOS ===');
  console.log('Total de Peças Ativas:', parts.length);
  console.log('Peças SEM NCM Válido:', withoutNcm.length);
  if (withoutNcm.length > 0) {
    console.log('Exemplos de peças sem NCM:', withoutNcm.slice(0, 5).map(p => ({ code: p.code, name: p.name, ncm: p.ncm })));
  } else {
    console.log('TUDO OK! Todas as peças possuem NCM válido de 8 dígitos.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
