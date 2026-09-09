/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { UserRole } from "./src/types";
import { PrismaClient } from "@prisma/client";
import { authenticateJWT, requireAuth, checkRole } from "./src/middlewares/auth";
import { tenantSubscriptionGuard } from "./src/middlewares/tenantGuard";
import { tenantService } from "./src/services/tenant.service";
import apiRoutes from "./src/routes";
import { registerSubscribers } from "./src/events/subscribers";
import { whatsAppSyncService } from "./src/services/whatsappSync.service";

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

  // Rota auto-recuperável e resiliente para /uploads/whatsapp/:fileName (auto-regenera caso o container tenha reiniciado)
  app.get("/uploads/whatsapp/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const localFilePath = path.join(process.cwd(), "public", "uploads", "whatsapp", fileName);

      // 1. Se o arquivo físico existe no disco local da VPS, serve imediatamente
      try {
        await fs.access(localFilePath);
        return res.sendFile(localFilePath);
      } catch (notFound) {
        // Arquivo físico não encontrado (ex: após deploy/rebuild ou pasta limpa)
      }

      // 2. Tenta recuperar no banco de dados para buscar da Evolution API sob demanda
      const message = await prisma.whatsappMessage.findFirst({
        where: {
          mediaUrl: {
            contains: fileName
          }
        }
      });

      if (!message || !message.keyId) {
        return res.status(404).send("Mídia não encontrada no servidor.");
      }

      // Obtém configurações da Evolution API
      let apiUrl = process.env.WHATSAPP_API_URL;
      let apiToken = process.env.WHATSAPP_API_TOKEN;
      let instanceName = process.env.WHATSAPP_INSTANCE_NAME || "mgv_oficial";

      if (!apiUrl) {
        const dbUrl = await prisma.officeSetting.findFirst({ where: { key: "WHATSAPP_API_URL" } });
        apiUrl = dbUrl?.value;
      }
      if (!apiToken) {
        const dbToken = await prisma.officeSetting.findFirst({ where: { key: "WHATSAPP_API_TOKEN" } });
        apiToken = dbToken?.value;
      }
      const dbInstance = await prisma.officeSetting.findFirst({ where: { key: "WHATSAPP_INSTANCE_NAME" } });
      if (dbInstance?.value) instanceName = dbInstance.value;

      if (!apiUrl || !apiToken) {
        return res.status(404).send("Configurações do WhatsApp ausentes.");
      }

      apiUrl = apiUrl.replace(/\/+$/, "");
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const evoRes = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiToken
        },
        body: JSON.stringify({
          message: {
            key: {
              id: message.keyId,
              remoteJid: message.remoteJid,
              fromMe: message.fromMe
            }
          },
          convertToMp4: false
        })
      });

      if (!evoRes.ok) {
        return res.status(404).send("Mídia expirada ou indisponível na Evolution API.");
      }

      const evoData = await evoRes.json();
      const base64Str = evoData.base64 || evoData.data;

      if (!base64Str) {
        return res.status(404).send("Nenhum dado retornado pela Evolution API.");
      }

      const mime = evoData.mimetype || message.mediaMimeType || (fileName.endsWith(".ogg") ? "audio/ogg" : fileName.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream");
      const buffer = Buffer.from(base64Str.replace(/^data:[^;]+;base64,/, ""), "base64");

      // Salva em cache no disco para acelerar os acessos seguintes
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "whatsapp");
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(localFilePath, buffer);
      } catch (writeErr) {
        console.warn("[Server Media Recovery] Falha ao gravar cache local:", writeErr);
      }

      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    } catch (err) {
      console.error("[Server Media Recovery] Erro ao recuperar mídia:", err);
      return res.status(500).send("Erro interno ao recuperar mídia.");
    }
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Inicia a rotina de backup em background
  startWeeklyBackupRoutine();

  // Inicia o Auto-Sync contínuo da Evolution API (busca em tempo real a cada 4 segundos)
  whatsAppSyncService.startAutoSyncRoutine(4000);

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

    // Garante que os planos padrão do SaaS (Starter, Pro, Enterprise) existam no banco
    await tenantService.ensureDefaultPlans();
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

  // Middlewares essenciais para processamento de JSON e formulários (incluindo Webhooks e uploads)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Middleware de Autenticação JWT com blindagem contra header spoofing
  app.use(authenticateJWT);

  // Middleware de Proteção de Tenant e Verificação de Assinatura (Trial / Ativo)
  app.use(tenantSubscriptionGuard);

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

  // Rota pública para servir a Apresentação Web / Diagnóstico Institucional
  app.get(["/apresentacao", "/apresentacao.html", "/apresentacao_web.html", "/diagnostico"], (req, res) => {
    const fileInDist = path.join(process.cwd(), "dist", "apresentacao_web.html");
    const fileInPublic = path.join(process.cwd(), "public", "apresentacao_web.html");
    
    if (fsSync.existsSync(fileInDist)) {
      return res.sendFile(fileInDist);
    }
    if (fsSync.existsSync(fileInPublic)) {
      return res.sendFile(fileInPublic);
    }
    res.status(404).send("Apresentação não encontrada.");
  });

  if (process.env.NODE_ENV !== "production") {
    const hmrPort = PORT ? 24678 + (PORT - 3000) : 24678;
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: hmrPort } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve os arquivos estáticos compilados (JS, CSS, imagens em /assets)
    app.use(express.static(distPath, { maxAge: "1y", index: false }));

    app.get("*", (req, res) => {
      // Impede que assets inexistentes ou rotas de API/uploads caiam no index.html retornando text/html
      if (req.path.startsWith("/uploads/") || req.path.startsWith("/api/") || req.path.startsWith("/assets/")) {
        return res.status(404).json({ error: "Recurso não encontrado." });
      }
      
      // Garante que o index.html sempre busque a versão mais recente dos scripts sem ficar preso em cache
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OS Flow Server] Servidor executando em http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar o servidor OS Flow:", error);
});
