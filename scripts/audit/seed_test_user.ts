import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Semeando usuário de teste no Supabase...");
  const testEmail = "admin@test.com";
  const password = "password123";
  
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (existing) {
    console.log("ℹ️ Usuário de teste já existe. Atualizando credenciais e permissões...");
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: "Admin Teste Auditoria",
        passwordHash,
        role: "OWNER"
      }
    });
  } else {
    console.log("🆕 Criando usuário de teste OWNER...");
    await prisma.user.create({
      data: {
        name: "Admin Teste Auditoria",
        email: testEmail,
        passwordHash,
        role: "OWNER"
      }
    });
  }

  console.log(`✅ Usuário semeado com sucesso: ${testEmail} / ${password}`);
}

main()
  .catch((err) => {
    console.error("❌ Erro ao semear usuário de teste:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
