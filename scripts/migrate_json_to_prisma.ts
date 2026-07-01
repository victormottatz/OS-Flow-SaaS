/**
 * Script para migrar dados de database.json para Supabase (Prisma)
 */
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const DB_FILE = path.join(process.cwd(), "database.json");
const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Iniciando migração do database.json para Prisma/Supabase...");

  try {
    const rawData = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(rawData);

    // 1. Limpar banco atual (CUIDADO, ESTAMOS SOBRESCREVENDO A NUVEM COM O LOCAL)
    console.log("🧹 Limpando tabelas no Supabase...");
    await prisma.ordemServico.deleteMany();
    await prisma.part.deleteMany();
    await prisma.device.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    // 2. Migrar Users
    if (db.users && db.users.length > 0) {
      console.log(`👤 Migrando ${db.users.length} usuários...`);
      await prisma.user.createMany({
        data: db.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
        })),
        skipDuplicates: true
      });
    }

    // 3. Migrar Clientes
    if (db.clients && db.clients.length > 0) {
      console.log(`👥 Migrando ${db.clients.length} clientes...`);
      await prisma.client.createMany({
        data: db.clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          cpfCnpj: c.cpfCnpj,
          phone: c.phone,
          email: c.email,
          address: c.address,
          deletedAt: c.deletedAt ? new Date(c.deletedAt) : null
        })),
        skipDuplicates: true
      });
    }

    // 4. Migrar Equipamentos
    if (db.devices && db.devices.length > 0) {
      console.log(`📱 Migrando ${db.devices.length} equipamentos...`);
      await prisma.device.createMany({
        data: db.devices.map((d: any) => ({
          id: d.id,
          clientId: d.clientId,
          type: d.type,
          brand: d.brand,
          model: d.model,
          serialNumber: d.serialNumber || "Sem Série",
          description: d.description || "",
          deletedAt: d.deletedAt ? new Date(d.deletedAt) : null
        })),
        skipDuplicates: true
      });
    }

    // 5. Migrar Peças (Estoque)
    if (db.parts && db.parts.length > 0) {
      console.log(`⚙️ Migrando ${db.parts.length} peças...`);
      await prisma.part.createMany({
        data: db.parts.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          stock: p.stock || 0,
          cost: p.cost || 0,
          price: p.price || 0
        })),
        skipDuplicates: true
      });
    }

    // 6. Migrar Ordens de Serviço
    if (db.ordensServico && db.ordensServico.length > 0) {
      console.log(`📋 Migrando ${db.ordensServico.length} OSs...`);
      await prisma.ordemServico.createMany({
        data: db.ordensServico.map((os: any) => ({
          id: os.id,
          osNumber: os.osNumber,
          clientId: os.clientId,
          deviceId: os.deviceId,
          reportedDefect: os.reportedDefect || "",
          accessoriesLeft: os.accessoriesLeft || "Nenhum",
          physicalState: os.physicalState || "Não especificado",
          status: os.status || "ORCAMENTO",
          diagnostic: os.diagnostic || null,
          usedParts: os.usedParts || [],
          laborCost: os.laborCost || 0,
          totalCost: os.totalCost || 0,
          billingStatus: os.billingStatus || "PENDENTE",
          blingId: os.blingId || null,
          blingKey: os.blingKey || null,
          sefazErrorMessage: os.sefazErrorMessage || null,
          pdfUrl: os.pdfUrl || null,
          billingLogs: os.billingLogs || [],
          createdAt: os.createdAt ? new Date(os.createdAt) : new Date(),
          deletedAt: os.deletedAt ? new Date(os.deletedAt) : null
        })),
        skipDuplicates: true
      });
    }

    console.log("✅ Migração finalizada com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro durante a migração:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
