import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const otavio = users.find(u => u.name.includes('Otávio') || u.name.includes('Otavio'));
  
  if (!otavio) {
    console.error("Usuário Otávio não encontrado!");
    return;
  }
  console.log("Encontrou:", otavio.name, otavio.id);

  const attendantPerms = await prisma.rolePermission.findMany({
    where: { role: 'ATTENDANT' },
    select: { permission: true }
  });
  
  const perms = attendantPerms.map(p => p.permission);
  
  // Mesclar permissões atuais com as de atendente, sem duplicar
  const currentPerms = otavio.permissions || [];
  const mergedPerms = Array.from(new Set([...currentPerms, ...perms]));
  
  const updatedUser = await prisma.user.update({
    where: { id: otavio.id },
    data: { permissions: mergedPerms }
  });
  
  console.log("Updated Otávio's permissions to include all reception (ATTENDANT) permissions:");
  console.log(updatedUser);
}

main().finally(async () => {
  await prisma.$disconnect();
});
