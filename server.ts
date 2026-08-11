/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs/promises";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { UserRole } from "./src/types";
import { PrismaClient } from "@prisma/client";
import { authenticateJWT, requireAuth, checkRole } from "./src/middlewares/auth";
import apiRoutes from "./src/routes";
import { registerSubscribers } from "./src/events/subscribers";

const prisma = new PrismaClient();
const DB_FILE = path.join(process.cwd(), "database.json");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("[CRITICAL SECURITY WARNING] JWT_SECRET não configurada em ambiente de produção!");
}

// Mutex / Queue Lock to prevent database file race conditions under high concurrency
class DatabaseLock {
  private queue: Promise<any> = Promise.resolve();

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => {});
    return next;
  }
}

const dbLock = new DatabaseLock();

async function readDB() {
  return dbLock.enqueue(async () => {
    try {
      const data = await fs.readFile(DB_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      return { users: [], clients: [], devices: [], parts: [], ordensServico: [] };
    }
  });
}

function startWeeklyBackupRoutine() {
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log("[Backup] Iniciando rotina de backup semanal...");
      const backupDir = path.join(process.cwd(), "backups");
      await fs.mkdir(backupDir, { recursive: true });
      const dbContent = await fs.readFile(DB_FILE, "utf-8");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `database_backup_${timestamp}.json`);
      await fs.writeFile(backupPath, dbContent, "utf-8");
      console.log(`[Backup] Backup concluído com sucesso: ${backupPath}`);
    } catch (err) {
      console.error("[Backup] Erro durante a rotina de backup:", err);
    }
  }, ONE_WEEK_MS);
  
  // Executa o primeiro backup em 1 minuto após o boot da aplicação para garantir consistência
  setTimeout(async () => {
    try {
      const backupDir = path.join(process.cwd(), "backups");
      await fs.mkdir(backupDir, { recursive: true });
      const dbContent = await fs.readFile(DB_FILE, "utf-8");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `database_boot_backup_${timestamp}.json`);
      await fs.writeFile(backupPath, dbContent, "utf-8");
      console.log(`[Backup] Backup de inicialização concluído: ${backupPath}`);
    } catch (err) {}
  }, 60000);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Inicia a rotina de backup em background
  startWeeklyBackupRoutine();

  // Database Migration seeder on boot: Hash passwords and ensure default role permissions (including TECHNICIAN / Bada)
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      const hasBcrypt = typeof u.passwordHash === "string" && (u.passwordHash.startsWith("$2a$") || u.passwordHash.startsWith("$2b$"));
      if (!hasBcrypt) {
        console.log(`[Database Migration] Hashing password for user ${u.email}...`);
        const hashed = await bcrypt.hash(u.passwordHash, 10);
        await prisma.user.update({
          where: { id: u.id },
          data: { passwordHash: hashed }
        });
      }
    }

    // Garantir permissões do perfil TECHNICIAN para visualização total do Kanban (Bada)
    const techPermissions = [
      'os.view', 'os.create', 'os.edit', 'os.change_status', 'os.finish', 'os.stress_test',
      'parts.view', 'parts.manage', 'clients.view', 'clients.manage', 'devices.notes',
      'financial.view', 'bling.view', 'bling.sync', 'whatsapp.send', 'users.view'
    ];

    for (const perm of techPermissions) {
      const exists = await prisma.rolePermission.findFirst({
        where: { role: 'TECHNICIAN', permission: perm }
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: { role: 'TECHNICIAN', permission: perm }
        });
      }
    }

    // Garantir permissões diretas no cadastro do usuário Bada
    const badaUser = users.find(u => u.name.toLowerCase().includes('bada'));
    if (badaUser && (!badaUser.permissions || !badaUser.permissions.includes('os.view'))) {
      await prisma.user.update({
        where: { id: badaUser.id },
        data: { permissions: techPermissions }
      });
      console.log(`[Boot Seeder] Permissões totais concedidas ao usuário Bada (${badaUser.email}).`);
    }
  } catch (err) {
    console.error("[Database Migration] Error during initialization seeder:", err);
  }

  // Endpoint público de Health Check (para monitoramento do Coolify, Traefik, Caddy)
  app.get("/health", async (req, res) => {
    try {
      // Executa uma consulta simples para validar a conexão com o banco de dados
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: "OK",
        database: "connected",
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[Health Check] Erro de conexão com o banco de dados:", err);
      res.status(500).json({
        status: "ERROR",
        database: "disconnected",
        error: err.message || err
      });
    }
  });

  // Middleware de Autenticação JWT com blindagem contra header spoofing
  app.use(authenticateJWT);

  // Registra os ouvintes (subscribers) do EventBus
  registerSubscribers();

  // DEBUG DB: Endpoint de diagnóstico (protegido exclusivamente para OWNER/ADMIN)
  app.get("/api/debug-db", requireAuth, checkRole(UserRole.OWNER, UserRole.ADMIN), async (req, res) => {
    try {
      const db = await readDB();
      res.json(db);
    } catch (err) {
      res.status(500).json({ error: "Erro ao ler banco de dados" });
    }
  });

  app.use("/api", apiRoutes);

  if (process.env.NODE_ENV !== "production") {
    const hmrPort = PORT ? 24678 + (PORT - 3000) : 24678;
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: hmrPort } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MGV Server] Servidor executando em http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar o servidor MGV:", error);
});
