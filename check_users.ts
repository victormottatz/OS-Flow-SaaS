import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, permissions: true } });
  console.log('Users:', JSON.stringify(users, null, 2));
  const roles = await prisma.rolePermission.findMany();
  console.log('RolePermissions:', JSON.stringify(roles, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
