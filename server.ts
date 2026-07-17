/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs/promises";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { UserRole, OSStatus } from "./src/types";
import { PrismaClient } from "@prisma/client";
import { authenticateJWT } from "./src/middlewares/auth";
import apiRoutes from "./src/routes";

const prisma = new PrismaClient();
const DB_FILE = path.join(process.cwd(), "database.json");
const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";

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

async function writeDB(data: any) {
  await dbLock.enqueue(async () => {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
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

  // Inicia a rotina de backup em background
  startWeeklyBackupRoutine();

  // Database Migration seeder on boot: Hash any plain text passwords to bcrypt in Supabase
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
  } catch (err) {
    console.error("[Database Migration] Error during initialization seeder:", err);
  }

  // ----------------------------------------------------
  // DEBUG DB: Endpoint de diagnóstico (leitura pura)
  // ----------------------------------------------------
  app.get("/api/debug-db", async (req, res) => {
    try {
      const db = await readDB();
      res.json(db);
    } catch (err) {
      res.status(500).json({ error: "Erro ao ler banco de dados" });
    }
  });

  // Token authentication middleware with backward-compatible role extraction
  app.use(authenticateJWT);
    app.use("/api", apiRoutes);

    if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, () => {
    console.log(`[MGV Server] Servidor executando em http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar o servidor MGV:", error);
});
