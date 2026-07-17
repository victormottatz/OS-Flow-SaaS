/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const DB_FILE = path.join(process.cwd(), "database.json");
const prisma = new PrismaClient();

async function run() {
  console.log("======================================================");
  console.log("    MGV TECNOLOGIA - SINCRONIZADOR SUPABASE -> JSON   ");
  console.log("======================================================");
  console.log("Conectando ao Supabase PostgreSQL via Prisma...");

  try {
    const users = await prisma.user.findMany();
    const clients = await prisma.client.findMany();
    const devices = await prisma.device.findMany();
    const parts = await prisma.part.findMany();
    const ordensServico = await prisma.ordemServico.findMany();

    const db = {
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        createdAt: u.createdAt.toISOString()
      })),
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        cpfCnpj: c.cpfCnpj,
        phone: c.phone,
        email: c.email,
        address: c.address,
        deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null
      })),
      devices: devices.map(d => ({
        id: d.id,
        clientId: d.clientId,
        type: d.type,
        brand: d.brand,
        model: d.model,
        serialNumber: d.serialNumber,
        description: d.description,
        deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null
      })),
      parts: parts.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        stock: p.stock,
        cost: p.cost,
        price: p.price
      })),
      ordensServico: ordensServico.map(os => {
        let parsedUsedParts = [];
        try {
          parsedUsedParts = typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts;
        } catch (e) {
          parsedUsedParts = [];
        }

        let parsedBillingLogs = [];
        try {
          parsedBillingLogs = typeof os.billingLogs === "string" ? JSON.parse(os.billingLogs) : os.billingLogs;
        } catch (e) {
          parsedBillingLogs = [];
        }

        return {
          id: os.id,
          osNumber: os.osNumber,
          clientId: os.clientId,
          deviceId: os.deviceId,
          reportedDefect: os.reportedDefect,
          accessoriesLeft: os.accessoriesLeft,
          physicalState: os.physicalState,
          status: os.status,
          diagnostic: os.diagnostic,
          usedParts: parsedUsedParts,
          laborCost: os.laborCost,
          totalCost: os.totalCost,
          billingStatus: os.billingStatus,
          blingId: os.blingId,
          blingKey: os.blingKey,
          sefazErrorMessage: os.sefazErrorMessage,
          pdfUrl: os.pdfUrl,
          billingLogs: parsedBillingLogs,
          createdAt: os.createdAt.toISOString(),
          deletedAt: os.deletedAt ? os.deletedAt.toISOString() : null
        };
      })
    };

    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    console.log("------------------------------------------------------");
    console.log("✓ Sincronização concluída com absoluto sucesso!");
    console.log(`- Usuários copiados: ${db.users.length}`);
    console.log(`- Clientes copiados: ${db.clients.length}`);
    console.log(`- Dispositivos copiados: ${db.devices.length}`);
    console.log(`- Peças copiadas: ${db.parts.length}`);
    console.log(`- Ordens de Serviço copiadas: ${db.ordensServico.length}`);
    console.log("------------------------------------------------------");
    console.log(`Os dados foram salvos localmente em: ${DB_FILE}`);
  } catch (err: any) {
    console.error("❌ Erro durante a sincronização:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
