import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Ajustando OSs criadas após o cutoff...");
  
  // Atualiza OS-5051 para OS-235115
  try {
    const os5051 = await prisma.ordemServico.findUnique({
      where: { osNumber: "OS-5051" }
    });
    if (os5051) {
      await prisma.ordemServico.update({
        where: { osNumber: "OS-5051" },
        data: { osNumber: "OS-235115" }
      });
      console.log("✅ OS-5051 atualizada para OS-235115");
    } else {
      console.log("⚠️ OS-5051 não encontrada ou já ajustada.");
    }
  } catch (err: any) {
    console.error("❌ Erro ao atualizar OS-5051:", err.message);
  }

  // Atualiza OS-5052 para OS-235116
  try {
    const os5052 = await prisma.ordemServico.findUnique({
      where: { osNumber: "OS-5052" }
    });
    if (os5052) {
      await prisma.ordemServico.update({
        where: { osNumber: "OS-5052" },
        data: { osNumber: "OS-235116" }
      });
      console.log("✅ OS-5052 atualizada para OS-235116");
    } else {
      console.log("⚠️ OS-5052 não encontrada ou já ajustada.");
    }
  } catch (err: any) {
    console.error("❌ Erro ao atualizar OS-5052:", err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
