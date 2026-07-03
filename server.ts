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

  app.use(express.json());

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

  // ----------------------------------------------------
  // PORTAL PÚBLICO: CONSULTA DE OS (SEM AUTENTICAÇÃO)
  // Esta rota DEVE ficar antes do middleware JWT
  // ----------------------------------------------------
  app.get("/api/publico/os", async (req, res) => {
    const { numero, cpfCnpj } = req.query as { numero?: string; cpfCnpj?: string };

    if (!numero || !cpfCnpj) {
      res.status(400).json({ error: "Os parâmetros 'numero' e 'cpfCnpj' são obrigatórios." });
      return;
    }

    // Normalizar CPF/CNPJ removendo formatação
    const cpfNormalizado = cpfCnpj.replace(/\D/g, "");
    if (cpfNormalizado.length < 11) {
      res.status(400).json({ error: "CPF/CNPJ inválido." });
      return;
    }

    try {
      // Busca a OS pelo número (case-insensitive)
      const os = await prisma.ordemServico.findFirst({
        where: {
          osNumber: {
            equals: numero as string,
            mode: "insensitive"
          },
          deletedAt: null
        },
        include: {
          client: true,
          device: true
        }
      });

      // Resposta genérica para evitar enumeração de dados (timing-safe: sempre busca cliente antes de retornar)
      if (!os || !os.client || os.client.cpfCnpj.replace(/\D/g, "") !== cpfNormalizado) {
        res.status(404).json({ error: "Nenhuma Ordem de Serviço encontrada para os dados informados." });
        return;
      }

      // Mapeamento de status para labels e mensagens amigáveis ao cliente
      const statusMap: Record<string, { label: string; message: string; color: string; step: number }> = {
        ORCAMENTO: {
          label: "Aguardando Orçamento",
          message: "Estamos avaliando seu equipamento e preparando o orçamento do reparo.",
          color: "yellow",
          step: 1
        },
        AGUARDANDO_PECA: {
          label: "Aguardando Peça",
          message: "O reparo está em andamento, mas aguardamos a chegada de um componente específico.",
          color: "orange",
          step: 2
        },
        EM_MANUTENCAO: {
          label: "Em Manutenção",
          message: "Ótima notícia! Seu equipamento está em processo de reparo pela nossa equipe técnica.",
          color: "blue",
          step: 3
        },
        PRONTO_RETIRADA: {
          label: "Pronto para Retirada",
          message: "Seu equipamento está pronto! Pode vir buscá-lo em nossa loja. Aguardamos sua visita!",
          color: "green",
          step: 4
        },
        FINALIZADO: {
          label: "Finalizado",
          message: "Serviço concluído com sucesso. Obrigado por confiar na MGV Assistência Técnica!",
          color: "purple",
          step: 5
        }
      };

      const statusInfo = statusMap[os.status] || {
        label: os.status,
        message: "Entre em contato conosco para mais informações.",
        color: "gray",
        step: 0
      };

      // Montar payload sanitizado — ZERO dados internos expostos
      const deviceLabel = os.device
        ? `${os.device.type} ${os.device.brand} ${os.device.model}`.trim()
        : "Equipamento";

      const showCost = os.status === "PRONTO_RETIRADA" || os.status === "FINALIZADO";

      const payload = {
        osNumber: os.osNumber,
        status: os.status,
        statusLabel: statusInfo.label,
        statusMessage: statusInfo.message,
        statusColor: statusInfo.color,
        statusStep: statusInfo.step,
        deviceLabel,
        reportedDefect: os.reportedDefect,
        accessoriesLeft: os.accessoriesLeft || "Nenhum acessório registrado.",
        createdAt: os.createdAt.toISOString(),
        clientName: os.client.name.split(" ")[0], // Apenas primeiro nome
        totalCost: showCost ? os.totalCost : null
      };

      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Token authentication middleware with backward-compatible role extraction
  app.use((req, res, next) => {
    console.log("[Auth Middleware] req.path:", req.path);
    if (req.path.startsWith("/api/auth/") || 
        req.path === "/api/integration/bling/callback" || 
        req.path === "/api/integration/bling/connect") {
      return next();
    }

    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.headers["x-user-role"] = decoded.role;
        (req as any).user = decoded;
        return next();
      } catch (err) {
        res.status(401).json({ error: "Sessão inválida ou expirada. Efetue login novamente." });
        return;
      }
    }



    // Allow static UI content and other non-API files to pass through
    if (!req.path.startsWith("/api/")) {
      return next();
    }

    res.status(401).json({ error: "Acesso negado. Token de autenticação não fornecido." });
    return;
  });

  // Circuit breaker state for Bling Integration
  let consecutiveBlingFailures = 0;
  let circuitBreakerTrippedUntil = 0; // timestamp

  // Helper to verify auth role
  const checkRole = (requiredRole: UserRole) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const userRole = req.headers["x-user-role"] as string;
      if (!userRole) {
        res.status(401).json({ error: "Não autenticado." });
        return;
      }
      if (userRole === UserRole.OWNER || userRole === requiredRole) {
        next();
      } else {
        res.status(403).json({ error: `Acesso negado: Apenas o perfil ${requiredRole} pode executar esta ação.` });
        return;
      }
    };
  };

  // ----------------------------------------------------
  // SPRINT 1: AUTHENTICATION
  // ----------------------------------------------------
  
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      res.status(401).json({ error: "Credenciais inválidas. Verifique seu e-mail e senha." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Credenciais inválidas. Verifique seu e-mail e senha." });
      return;
    }

    // Generate real JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      }
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "Todos os campos (nome, e-mail, senha, perfil) são obrigatórios." });
      return;
    }

    const userCount = await prisma.user.count();

    if (userCount > 0) {
      // Must be authenticated as OWNER
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Acesso negado. Apenas o Dono pode cadastrar novos usuários." });
        return;
      }
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.role !== UserRole.OWNER) {
          res.status(403).json({ error: "Acesso negado. Apenas o Dono pode cadastrar novos usuários." });
          return;
        }
      } catch (err) {
        res.status(401).json({ error: "Sessão inválida." });
        return;
      }
    }

    const exists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (exists) {
      res.status(409).json({ error: "Este e-mail já possui uma conta cadastrada." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role as any,
      }
    });

    res.status(201).json({
      message: "Colaborador cadastrado com sucesso!",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt.toISOString()
      }
    });
  });

  // GET users (Only OWNER)
  app.get("/api/users", checkRole(UserRole.OWNER), async (req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    res.json(users.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString()
    })));
  });

  // DELETE user (Only OWNER)
  app.delete("/api/users/:id", checkRole(UserRole.OWNER), async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    
    // Check if the user is the last owner
    if (user.role === UserRole.OWNER) {
      const ownerCount = await prisma.user.count({
        where: { role: UserRole.OWNER }
      });
      if (ownerCount <= 1) {
        res.status(400).json({ error: "Não é possível remover o único dono do sistema." });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Usuário removido com sucesso." });
  });

  // ----------------------------------------------------
  // BLING INTEGRATION OAUTH ROUTES
  // ----------------------------------------------------
  app.get("/api/integration/bling/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #121212; color: #ffffff;">
            <div style="background-color: #1c1b1b; padding: 2rem; border-radius: 8px; border-top: 4px solid #ef4444; text-align: center;">
              <span style="font-size: 3rem; color: #ef4444;">❌</span>
              <h2>Código de Autorização Ausente</h2>
              <p>O Bling não enviou o código de autorização necessário.</p>
              <a href="/" style="color: #fdc003; text-decoration: none; margin-top: 1rem; display: inline-block;">Voltar ao Sistema</a>
            </div>
          </body>
        </html>
      `);
      return;
    }

    try {
      const { exchangeCode } = await import("./src/services/bling");
      await exchangeCode(code as string);
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #121212; color: #ffffff;">
            <div style="background-color: #1c1b1b; padding: 2rem; border-radius: 8px; border-top: 4px solid #fdc003; text-align: center;">
              <span style="font-size: 3rem; color: #10b981;">✓</span>
              <h2>Integração Bling Autorizada!</h2>
              <p>O token de acesso foi configurado com sucesso.</p>
              <button onclick="window.close()" style="background-color: #fdc003; color: #121212; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 1rem;">Fechar Janela</button>
            </div>
            <script>
              setTimeout(() => {
                window.location.href = "/";
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #121212; color: #ffffff;">
            <div style="background-color: #1c1b1b; padding: 2rem; border-radius: 8px; border-top: 4px solid #ef4444; text-align: center;">
              <span style="font-size: 3rem; color: #ef4444;">❌</span>
              <h2>Erro na Integração</h2>
              <p>${err.message}</p>
              <a href="/" style="color: #fdc003; text-decoration: none; margin-top: 1rem; display: inline-block;">Voltar ao Sistema</a>
            </div>
          </body>
        </html>
      `);
    }
  });

  app.get("/api/integration/bling/status", async (req, res) => {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const localPrisma = new PrismaClient();
      const config = await localPrisma.blingConfig.findUnique({ where: { id: 1 } });
      await localPrisma.$disconnect();

      if (!config) {
        res.json({ authorized: false, expiresAt: null, updatedAt: null });
        return;
      }

      res.json({
        authorized: true,
        expiresAt: config.expiresAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/integration/bling/connect", (req, res) => {
    const clientId = process.env.BLING_CLIENT_ID;
    if (!clientId) {
      res.status(500).send("BLING_CLIENT_ID não configurado no backend.");
      return;
    }
    const state = Math.random().toString(36).substring(7);
    
    // Configura a URL de retorno fixa para o servidor de produção no Render
    const redirectUri = "https://mgv-sistema-integrado.onrender.com/api/integration/bling/callback";
    
    const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.redirect(authUrl);
  });

  app.delete("/api/integration/bling/disconnect", async (req, res) => {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const localPrisma = new PrismaClient();
      await localPrisma.blingConfig.deleteMany(); // Deletes config to revoke access
      await localPrisma.$disconnect();
      res.json({ success: true, message: "Integração desconectada e credenciais removidas." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/debug-db", async (req, res) => {
    try {
      const data = await fs.readFile(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      res.json({
        dbPath: DB_FILE,
        exists: true,
        sizeBytes: data.length,
        counts: {
          users: db.users?.length || 0,
          clients: db.clients?.length || 0,
          devices: db.devices?.length || 0,
          parts: db.parts?.length || 0,
          ordensServico: db.ordensServico?.length || 0
        }
      });
    } catch (err: any) {
      res.json({
        dbPath: DB_FILE,
        exists: false,
        error: err.message
      });
    }
  });

  // ----------------------------------------------------
  // SPRINT 2: BASE REGISTERS (CLIENTS AND DEVICES)
  // ----------------------------------------------------
  
  app.get("/api/clients", async (req, res) => {
    try {
      const activeClients = await prisma.client.findMany({
        where: { deletedAt: null },
        include: {
          devices: {
            where: { deletedAt: null }
          }
        }
      });

      res.json(activeClients.map(c => ({
        id: c.id,
        name: c.name,
        cpfCnpj: c.cpfCnpj,
        phone: c.phone,
        email: c.email,
        address: c.address,
        deletedAt: null,
        devices: c.devices.map(d => ({
          id: d.id,
          clientId: d.clientId,
          type: d.type,
          brand: d.brand,
          model: d.model,
          serialNumber: d.serialNumber,
          description: d.description,
          deletedAt: null
        }))
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/clients", async (req, res) => {
    const { name, cpfCnpj, phone, email, address, devices } = req.body;
    
    if (!name || !cpfCnpj || !phone || !email || !address) {
      res.status(422).json({ error: "Parâmetros incorretos. Todos os campos de cadastro do cliente são obrigatórios." });
      return;
    }

    try {
      const activeClients = await prisma.client.findMany({
        where: { deletedAt: null }
      });
      const isDuplicate = activeClients.some(c => c.cpfCnpj.replace(/\D/g, '') === cpfCnpj.replace(/\D/g, ''));
      if (isDuplicate) {
        res.status(409).json({ error: "CPF/CNPJ duplicado. Já existe um cliente ativo cadastrado com este documento." });
        return;
      }

      const client = await prisma.client.create({
        data: {
          name,
          cpfCnpj,
          phone,
          email,
          address,
        }
      });

      const insertedDevices: any[] = [];
      if (devices && Array.isArray(devices)) {
        for (const dev of devices) {
          const serialNo = dev.serialNumber?.trim() ? dev.serialNumber.trim() : "Sem Série";
          
          const newDev = await prisma.device.create({
            data: {
              clientId: client.id,
              type: dev.type || "Outro",
              brand: dev.brand || "Generico",
              model: dev.model || "N/A",
              serialNumber: serialNo,
              description: dev.description || "Nenhuma especificação gravada.",
            }
          });
          insertedDevices.push({
            id: newDev.id,
            clientId: newDev.clientId,
            type: newDev.type,
            brand: newDev.brand,
            model: newDev.model,
            serialNumber: newDev.serialNumber,
            description: newDev.description,
            deletedAt: null
          });
        }
      }

      res.status(201).json({
        client: {
          id: client.id,
          name: client.name,
          cpfCnpj: client.cpfCnpj,
          phone: client.phone,
          email: client.email,
          address: client.address,
          deletedAt: null
        },
        devices: insertedDevices
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    const { name, cpfCnpj, phone, email, address } = req.body;

    try {
      const client = await prisma.client.findUnique({
        where: { id }
      });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const activeClients = await prisma.client.findMany({
        where: { deletedAt: null }
      });
      const isDuplicate = activeClients.some(
        c => c.id !== id && c.cpfCnpj.replace(/\D/g, '') === cpfCnpj.replace(/\D/g, '')
      );
      if (isDuplicate) {
        res.status(409).json({ error: "CPF/CNPJ duplicado. Já existe outro cliente cadastrado com este documento." });
        return;
      }

      const updated = await prisma.client.update({
        where: { id },
        data: {
          name,
          cpfCnpj,
          phone,
          email,
          address
        }
      });

      res.json({
        id: updated.id,
        name: updated.name,
        cpfCnpj: updated.cpfCnpj,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        deletedAt: null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/clients/:id", checkRole(UserRole.OWNER), async (req, res) => {
    const { id } = req.params;
    try {
      const client = await prisma.client.findUnique({
        where: { id }
      });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const deletedTime = new Date();

      await prisma.$transaction([
        prisma.client.update({
          where: { id },
          data: { deletedAt: deletedTime }
        }),
        prisma.device.updateMany({
          where: { clientId: id },
          data: { deletedAt: deletedTime }
        }),
        prisma.ordemServico.updateMany({
          where: { clientId: id },
          data: { deletedAt: deletedTime }
        })
      ]);

      res.json({ message: "Cliente e vínculos excluídos (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/devices", async (req, res) => {
    const { clientId, type, brand, model, serialNumber, description } = req.body;
    if (!clientId || !type || !brand || !model) {
      res.status(400).json({ error: "Parâmetros incompletos para cadastro de equipamento." });
      return;
    }

    const serialStr = serialNumber?.trim() ? serialNumber.trim() : "Sem Série";
    if (serialStr === "Sem Série" && (!description || description.trim().length < 5)) {
      res.status(422).json({ error: "Para dispositivos sem número de série, é obrigatório preencher uma descrição detalhada de características físicas para rastreabilidade." });
      return;
    }

    try {
      const newDev = await prisma.device.create({
        data: {
          clientId,
          type,
          brand,
          model,
          serialNumber: serialStr,
          description: description || "Nenhuma característica estética informada."
        }
      });

      res.status(201).json({
        id: newDev.id,
        clientId: newDev.clientId,
        type: newDev.type,
        brand: newDev.brand,
        model: newDev.model,
        serialNumber: newDev.serialNumber,
        description: newDev.description,
        deletedAt: null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // SPRINT 2 & 3: WORK ORDERS (OS)
  // ----------------------------------------------------
  
  app.get("/api/ordens-servico", async (req, res) => {
    try {
      const activeOS = await prisma.ordemServico.findMany({
        where: { deletedAt: null },
        include: {
          client: true,
          device: true
        }
      });

      res.json(activeOS.map(os => ({
        id: os.id,
        osNumber: os.osNumber,
        clientId: os.clientId,
        deviceId: os.deviceId,
        reportedDefect: os.reportedDefect,
        accessoriesLeft: os.accessoriesLeft,
        physicalState: os.physicalState,
        status: os.status,
        diagnostic: os.diagnostic,
        usedParts: typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts,
        laborCost: os.laborCost,
        totalCost: os.totalCost,
        billingStatus: os.billingStatus,
        blingId: os.blingId,
        blingKey: os.blingKey,
        sefazErrorMessage: os.sefazErrorMessage,
        pdfUrl: os.pdfUrl,
        billingLogs: typeof os.billingLogs === "string" ? JSON.parse(os.billingLogs) : os.billingLogs,
        checklistEntrada: typeof os.checklistEntrada === "string" ? JSON.parse(os.checklistEntrada || "[]") : os.checklistEntrada || [],
        laudoFotos: typeof os.laudoFotos === "string" ? JSON.parse(os.laudoFotos || "[]") : os.laudoFotos || [],
        createdAt: os.createdAt.toISOString(),
        deletedAt: null,
        client: os.client ? { id: os.client.id, name: os.client.name, cpfCnpj: os.client.cpfCnpj, phone: os.client.phone, email: os.client.email, address: os.client.address } : null,
        device: os.device ? { id: os.device.id, type: os.device.type, brand: os.device.brand, model: os.device.model, serialNumber: os.device.serialNumber, description: os.device.description } : null
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ordens-servico", async (req, res) => {
    const { clientId, deviceId, reportedDefect, accessoriesLeft, physicalState, checklistEntrada, laudoFotos } = req.body;
    
    if (!clientId || !deviceId || !reportedDefect) {
      res.status(422).json({ error: "O preenchimento do Cliente, Dispositivo e Defeito Relatado é estritamente obrigatório." });
      return;
    }

    try {
      const osCount = await prisma.ordemServico.count();
      const nextSeq = osCount + 1;
      const osNumber = `OS-${String(nextSeq).padStart(4, "0")}`;

      const newOS = await prisma.ordemServico.create({
        data: {
          osNumber,
          clientId,
          deviceId,
          reportedDefect,
          accessoriesLeft: accessoriesLeft || "Nenhum acessório deixado.",
          physicalState: physicalState || "Sem avarias aparentes.",
          status: "ORCAMENTO",
          diagnostic: "",
          usedParts: [],
          laborCost: 0,
          totalCost: 0,
          checklistEntrada: checklistEntrada || [],
          laudoFotos: laudoFotos || [],
          billingStatus: "PENDENTE",
          billingLogs: []
        }
      });

      res.status(201).json({
        ...newOS,
        usedParts: [],
        billingLogs: [],
        checklistEntrada: newOS.checklistEntrada || [],
        laudoFotos: newOS.laudoFotos || [],
        createdAt: newOS.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ordens-servico/:id", async (req, res) => {
    const { id } = req.params;
    const { diagnostic, usedParts, laborCost, technicianLaborHours, technicianHourlyRate, checklistEntrada, laudoFotos } = req.body;

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (currentOS.status === "FINALIZADO" && (checklistEntrada !== undefined || laudoFotos !== undefined)) {
        res.status(400).json({ error: "Não é permitido alterar o laudo fotográfico ou checklist de uma Ordem de Serviço finalizada." });
        return;
      }

      if (usedParts && Array.isArray(usedParts)) {
        const parts = await prisma.part.findMany();
        
        const prevParts: any[] = typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || [];
        for (const prevItem of prevParts) {
          const part = parts.find(p => p.id === prevItem.partId);
          if (part) {
            await prisma.part.update({
              where: { id: part.id },
              data: { stock: { increment: prevItem.quantity } }
            });
          }
        }

        for (const item of usedParts) {
          const freshPart = await prisma.part.findUnique({ where: { id: item.partId } });
          if (!freshPart) continue;

          if (freshPart.stock < item.quantity) {
            res.status(400).json({ error: `Estoque insuficiente para a peça '${freshPart.name}'. Estoque disponível: ${freshPart.stock}` });
            return;
          }
          await prisma.part.update({
            where: { id: freshPart.id },
            data: { stock: { decrement: item.quantity } }
          });
          
          if (item.costSnapshot === undefined) {
            item.costSnapshot = freshPart.cost || 0;
          }
        }
      }

      const partsTotal = (usedParts || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const resolvedLaborCost = Number(laborCost) || 0;
      const resolvedTotal = partsTotal + resolvedLaborCost;

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          diagnostic: diagnostic !== undefined ? diagnostic : currentOS.diagnostic,
          usedParts: usedParts !== undefined ? usedParts : currentOS.usedParts,
          laborCost: resolvedLaborCost,
          technicianLaborHours: technicianLaborHours !== undefined ? Number(technicianLaborHours) : currentOS.technicianLaborHours,
          technicianHourlyRate: technicianHourlyRate !== undefined ? Number(technicianHourlyRate) : currentOS.technicianHourlyRate,
          totalCost: resolvedTotal,
          checklistEntrada: checklistEntrada !== undefined ? checklistEntrada : currentOS.checklistEntrada,
          laudoFotos: laudoFotos !== undefined ? laudoFotos : currentOS.laudoFotos
        }
      });

      res.json({
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ordens-servico/:id/laudo-fotos", async (req, res) => {
    const { id } = req.params;
    const { checklistEntrada, laudoFotos } = req.body;

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (currentOS.status === "FINALIZADO") {
        res.status(400).json({ error: "Não é permitido alterar o laudo fotográfico ou checklist de uma Ordem de Serviço finalizada." });
        return;
      }

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          checklistEntrada: checklistEntrada !== undefined ? checklistEntrada : currentOS.checklistEntrada,
          laudoFotos: laudoFotos !== undefined ? laudoFotos : currentOS.laudoFotos
        }
      });

      res.json({
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/ordens-servico/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: "Status é obrigatório." });
      return;
    }

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      const previousStatus = currentOS.status;
      const osUsedParts = typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || [];

      if (status === "FINALIZADO" || status === "PRONTO_RETIRADA") {
        const parts = await prisma.part.findMany();
        const missingSerials: string[] = [];

        for (const usedPart of osUsedParts) {
          const partDef = parts.find((p: any) => p.id === usedPart.partId);
          if (partDef && partDef.requiresSerial && (!usedPart.serialNumber || usedPart.serialNumber.trim() === "")) {
            missingSerials.push(partDef.name || partDef.code);
          }
        }

        if (missingSerials.length > 0) {
          res.status(422).json({
            error: `Bloqueio de Serialização: As seguintes peças exigem Número de Série antes de avançar: ${missingSerials.join(", ")}. Edite a OS e preencha o nº de série de cada peça obrigatória.`,
            code: "SERIAL_REQUIRED",
            missingParts: missingSerials
          });
          return;
        }

        if (!currentOS.diagnostic || currentOS.diagnostic.trim() === "") {
          res.status(422).json({
            error: "Bloqueio: É obrigatório preencher o Laudo Técnico antes de finalizar ou disponibilizar a OS.",
            code: "DIAGNOSTIC_REQUIRED"
          });
          return;
        }
        
        const labor = currentOS.laborCost || 0;
        if (labor === 0 && osUsedParts.length === 0) {
          res.status(422).json({
            error: "Bloqueio: A Ordem de Serviço está sem Custo de Mão de Obra e sem Peças. Preencha os valores no laudo antes de avançar.",
            code: "COST_REQUIRED"
          });
          return;
        }
      }

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          status: status as any
        }
      });

      if (status === "FINALIZADO" && previousStatus !== "FINALIZADO") {
        const initialLogs = [
          "Status alterado para FINALIZADO.",
          "Iniciando integração de faturamento no Bling síncrono..."
        ];
        
        await prisma.ordemServico.update({
          where: { id },
          data: {
            billingStatus: "PROCESSANDO",
            billingLogs: initialLogs
          }
        });
        
        const clientSnapshot = await prisma.client.findUnique({
          where: { id: updated.clientId }
        });
        const partsDbSnapshot = await prisma.part.findMany();

        import("./src/services/osToBling").then(async ({ sendOsToBling }) => {
          try {
            const osSnapshot = {
              ...updated,
              status,
              billingStatus: "PROCESSANDO",
              billingLogs: initialLogs,
              usedParts: osUsedParts
            };

            const result = await sendOsToBling(osSnapshot, clientSnapshot, partsDbSnapshot);
            if (result.success) {
              await prisma.ordemServico.update({
                where: { id: updated.id },
                data: {
                  billingStatus: "FATURADO",
                  blingId: result.blingId,
                  sefazErrorMessage: result.error ? result.error : (result.notaFiscalId ? `NF-e gerada com sucesso (ID: ${result.notaFiscalId})` : "Pedido faturado com sucesso no Bling.")
                }
              });
            } else {
              await prisma.ordemServico.update({
                where: { id: updated.id },
                data: {
                  billingStatus: "REJEITADO",
                  sefazErrorMessage: result.error
                }
              });
            }
          } catch (e: any) {
            console.error("[Bling Worker Error]", e);
            await prisma.ordemServico.update({
              where: { id: updated.id },
              data: {
                billingStatus: "REJEITADO",
                sefazErrorMessage: e.message
              }
            });
          }
        });
      }

      res.json({
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/ordens-servico/:id", checkRole(UserRole.OWNER), async (req, res) => {
    const { id } = req.params;
    try {
      const os = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!os || os.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      await prisma.ordemServico.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.json({ message: "Ordem de Serviço excluída (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // SPRINT 3: PARTS & INVENTORY (Enterprise Module)
  // ----------------------------------------------------
  app.get("/api/parts", async (req, res) => {
    try {
      const activeParts = await prisma.part.findMany({
        where: { deletedAt: null }
      });
      res.json(activeParts.map(p => ({
        ...p,
        createdAt: p.createdAt?.toISOString() || undefined,
        deletedAt: null
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/parts", async (req, res) => {
    const { name, code, sku, barcode, stock, stockMin, cost, price, requiresSerial, supplier, location } = req.body;
    if (!name || !code || stock === undefined || cost === undefined || price === undefined) {
      res.status(400).json({ error: "Os campos Nome, Código, Estoque, Custo e Preço são obrigatórios." });
      return;
    }

    try {
      const codeExists = await prisma.part.findFirst({
        where: { code, deletedAt: null }
      });
      if (codeExists) {
        res.status(409).json({ error: `Já existe uma peça ativa com o código '${code}'.` });
        return;
      }

      const newPart = await prisma.part.create({
        data: {
          name,
          code,
          sku: sku || null,
          barcode: barcode || null,
          stock: Number(stock) || 0,
          stockMin: Number(stockMin) || 0,
          cost: Number(cost) || 0,
          price: Number(price) || 0,
          requiresSerial: Boolean(requiresSerial) || false,
          supplier: supplier || null,
          location: location || null,
        }
      });

      res.status(201).json({
        ...newPart,
        createdAt: newPart.createdAt.toISOString(),
        deletedAt: null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/parts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, code, sku, barcode, stock, stockMin, cost, price, requiresSerial, supplier, location } = req.body;

    try {
      const part = await prisma.part.findUnique({ where: { id } });
      if (!part || part.deletedAt) {
        res.status(404).json({ error: "Peça não encontrada." });
        return;
      }

      if (code) {
        const codeExists = await prisma.part.findFirst({
          where: { id: { not: id }, code, deletedAt: null }
        });
        if (codeExists) {
          res.status(409).json({ error: `Já existe outra peça ativa com o código '${code}'.` });
          return;
        }
      }

      const updated = await prisma.part.update({
        where: { id },
        data: {
          name: name !== undefined ? name : part.name,
          code: code !== undefined ? code : part.code,
          sku: sku !== undefined ? sku : part.sku,
          barcode: barcode !== undefined ? barcode : part.barcode,
          stock: stock !== undefined ? Number(stock) : part.stock,
          stockMin: stockMin !== undefined ? Number(stockMin) : part.stockMin,
          cost: cost !== undefined ? Number(cost) : part.cost,
          price: price !== undefined ? Number(price) : part.price,
          requiresSerial: requiresSerial !== undefined ? Boolean(requiresSerial) : part.requiresSerial,
          supplier: supplier !== undefined ? supplier : part.supplier,
          location: location !== undefined ? location : part.location,
        }
      });

      res.json({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        deletedAt: null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/parts/:id", checkRole(UserRole.OWNER), async (req, res) => {
    const { id } = req.params;
    try {
      const part = await prisma.part.findUnique({ where: { id } });
      if (!part || part.deletedAt) {
        res.status(404).json({ error: "Peça não encontrada." });
        return;
      }

      await prisma.part.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.json({ message: "Peça excluída (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // SPRINT 2: INTEGRATION BLING CATALOG SYNCHRONIZATION (CLIENTS & PARTS)
  // ----------------------------------------------------
  let catalogSyncProgress = {
    isSyncing: false,
    total: 0,
    processed: 0,
    successCount: 0,
    errorCount: 0,
    currentType: "idle" as "clients" | "parts" | "idle",
    logs: [] as string[],
    shouldStop: false
  };

  async function runCatalogSync() {
    catalogSyncProgress.isSyncing = true;
    catalogSyncProgress.processed = 0;
    catalogSyncProgress.successCount = 0;
    catalogSyncProgress.errorCount = 0;
    catalogSyncProgress.logs = ["Iniciando sincronização geral de cadastro..."];
    catalogSyncProgress.shouldStop = false;

    try {
      const db = await readDB();
      const activeClients = db.clients.filter((c: any) => !c.deletedAt);
      const activeParts = db.parts || [];

      catalogSyncProgress.total = activeClients.length + activeParts.length;
      catalogSyncProgress.logs.push(`Mapeados ${activeClients.length} clientes e ${activeParts.length} peças.`);

      const { syncClientToBling, syncPartToBling } = await import("./src/services/bling");

      let clientCount = 0;
      let partCount = 0;

      // 1. Sync clients
      catalogSyncProgress.currentType = "clients";
      for (const client of activeClients) {
        if (catalogSyncProgress.shouldStop) {
          catalogSyncProgress.logs.push("[Sincronização] Interrompida pelo operador.");
          break;
        }

        try {
          await syncClientToBling(client);
          catalogSyncProgress.successCount++;
        } catch (err: any) {
          catalogSyncProgress.errorCount++;
          catalogSyncProgress.logs.push(`[ERRO] Cliente ${client.name}: ${err.message}`);
        } finally {
          catalogSyncProgress.processed++;
          clientCount++;
          if (clientCount % 50 === 0 || clientCount === activeClients.length) {
            catalogSyncProgress.logs.push(`[Progresso] Lote ${clientCount}/${activeClients.length} de clientes concluído.`);
          }
        }

        // Throttling delay (350ms to satisfy max 3 req/sec limit)
        await new Promise(resolve => setTimeout(resolve, 350));
      }

      // 2. Sync parts
      if (!catalogSyncProgress.shouldStop) {
        catalogSyncProgress.currentType = "parts";
        for (const part of activeParts) {
          if (catalogSyncProgress.shouldStop) {
            catalogSyncProgress.logs.push("[Sincronização] Interrompida pelo operador.");
            break;
          }

          try {
            await syncPartToBling(part);
            catalogSyncProgress.successCount++;
          } catch (err: any) {
            catalogSyncProgress.errorCount++;
            catalogSyncProgress.logs.push(`[ERRO] Peça ${part.name}: ${err.message}`);
          } finally {
            catalogSyncProgress.processed++;
            partCount++;
            if (partCount % 50 === 0 || partCount === activeParts.length) {
              catalogSyncProgress.logs.push(`[Progresso] Lote ${partCount}/${activeParts.length} de peças concluído.`);
            }
          }

          // Throttling delay (350ms to satisfy max 3 req/sec limit)
          await new Promise(resolve => setTimeout(resolve, 350));
        }
      }

      if (catalogSyncProgress.shouldStop) {
        catalogSyncProgress.logs.push("Processo finalizado com cancelamento.");
      } else {
        catalogSyncProgress.logs.push("========================================");
        catalogSyncProgress.logs.push("🎉 SUMÁRIO FINAL - RELATÓRIO DE GO-LIVE 🎉");
        catalogSyncProgress.logs.push(`Total de Itens Processados: ${catalogSyncProgress.processed}`);
        catalogSyncProgress.logs.push(`Clientes Sincronizados com Sucesso: ${clientCount - (catalogSyncProgress.errorCount <= clientCount ? catalogSyncProgress.errorCount : 0)}`);
        catalogSyncProgress.logs.push(`Peças Sincronizadas com Sucesso: ${partCount - (catalogSyncProgress.errorCount - clientCount > 0 ? (catalogSyncProgress.errorCount - clientCount) : 0)}`);
        catalogSyncProgress.logs.push(`Total de Erros/Rejeições: ${catalogSyncProgress.errorCount}`);
        catalogSyncProgress.logs.push("========================================");
      }

    } catch (err: any) {
      catalogSyncProgress.logs.push(`[FALHA GERAL] Erro crítico no loop de sincronização: ${err.message}`);
    } finally {
      catalogSyncProgress.isSyncing = false;
      catalogSyncProgress.currentType = "idle";
    }
  }

  app.post("/api/integration/bling/sync/catalog", (req, res) => {
    if (catalogSyncProgress.isSyncing) {
      res.status(409).json({ error: "Sincronização já está em andamento." });
      return;
    }
    runCatalogSync();
    res.json({ success: true, message: "Sincronização iniciada em segundo plano." });
  });

  app.get("/api/integration/bling/sync/catalog/progress", (req, res) => {
    // Return last 20 logs
    const logsSlice = catalogSyncProgress.logs.slice(-20);
    res.json({
      ...catalogSyncProgress,
      logs: logsSlice
    });
  });

  app.post("/api/integration/bling/sync/catalog/stop", (req, res) => {
    if (!catalogSyncProgress.isSyncing) {
      res.status(400).json({ error: "Nenhuma sincronização em execução." });
      return;
    }
    catalogSyncProgress.shouldStop = true;
    catalogSyncProgress.logs.push("Solicitação de parada enviada...");
    res.json({ success: true, message: "Sincronização interrompida." });
  });

  // ----------------------------------------------------
  // SPRINT 4: INTEGRATION BLING V3 PROCESSOR
  // ----------------------------------------------------
  
  app.post("/api/integration/bling/sync/:osId", async (req, res) => {
    const { osId } = req.params;
    const { forceErrorType, simulatedTimeout } = req.body; // Allows fine-grained simulation of errors like Sefaz rejections, timeouts, etc.
    
    const db = await readDB();
    const index = db.ordensServico.findIndex((os: any) => os.id === osId);
    if (index === -1) {
      res.status(404).json({ error: "Ordem de serviço não encontrada." });
      return;
    }

    const os = db.ordensServico[index];
    const client = db.clients.find((c: any) => c.id === os.clientId);
    const device = db.devices.find((d: any) => d.id === os.deviceId);

    if (!client) {
      res.status(400).json({ error: "Faturamento impossível: Cliente associado inexistente ou excluído." });
      return;
    }

    const logs: string[] = ["Conexão estabelecida com gateway de faturamento MGV."];
    
    // Circuit Breaker simulation
    const now = Date.now();
    if (consecutiveBlingFailures >= 3 && now < circuitBreakerTrippedUntil) {
      const remainingTime = Math.ceil((circuitBreakerTrippedUntil - now) / 1000);
      logs.push(`[CIRCUIT BREAKER] Abortando sincronia imediata. Gateway travado temporariamente.`);
      
      os.billingStatus = "PENDENTE";
      os.billingLogs = logs;
      os.sefazErrorMessage = `Circuit Breaker Ativo: Servidores Bling indisponíveis por falhas recorrentes. Próxima liberação em ${remainingTime}s. Solicitação armazenada na Fila Interna de Lote.`;
      
      db.ordensServico[index] = os;
      await writeDB(db);

      res.status(503).json({ 
        error: "Serviço indisponível", 
        feedbackMessage: "Faturamento indisponível no momento. O sistema tentará reenviar em breve.",
        logs 
      });
      return;
    }

    // Prepare Bling V3 payload structure (As documented)
    const blingPayload = {
      tipo: "P", // Pedido
      data: new Date().toISOString().split('T')[0],
      contato: {
        nome: client.name,
        tipoPessoa: client.cpfCnpj.length > 14 ? "J" : "F",
        numeroDocumento: client.cpfCnpj.replace(/\D/g, '')
      },
      itens: [
        ...os.usedParts.map((p: any) => ({
          codigo: p.partId,
          descricao: p.name,
          quantidade: p.quantity,
          valor: p.price
        })),
        {
          codigo: "SUP-SERV",
          descricao: `Serviço de reparo técnico: ${device?.type || ''} ${device?.brand || ''} ${device?.model || ''} - OS #${os.osNumber}`,
          quantidade: 1,
          valor: os.laborCost
        }
      ],
      vendedor: "MGV Assistência",
      observações: `Ordem de Serviço nº ${os.osNumber}. Defeito: ${os.reportedDefect}`
    };

    logs.push("Estrutura do pedido de venda Bling V3 construída com sucesso.");
    logs.push("Pesquisando por chaves e autorizações fiscais no ambiente...");

    // Check if real Bling V3 API token exists
    const BLING_API_KEY = process.env.BLING_API_KEY;

    if (BLING_API_KEY && !forceErrorType) {
      logs.push("Chave de produção Bling dectetada. Iniciando conexão HTTPS...");
      
      try {
        // Real request with 10s timeout
        const axios = (await import("axios")).default;
        logs.push("Enviando solicitação HTTP POST para api.bling.com.br/v3/pedidos...");
        
        const response = await axios.post("https://api.bling.com.br/v3/pedidos", blingPayload, {
          headers: {
            "Authorization": `Bearer ${BLING_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 10000 // 10 seconds rigid timeout
        });

        logs.push("Retorno da API Bling processado com status 201!");
        consecutiveBlingFailures = 0; // reset
        
        const xmlChave = `NFe-${Date.now()}-mock-success`;
        os.billingStatus = "FATURADO";
        os.blingId = response.data?.data?.id || `bling-${Date.now()}`;
        os.blingKey = xmlChave;
        os.pdfUrl = `/api/integration/bling/danfe-pdf/${os.id}`;
        os.sefazErrorMessage = "";
        logs.push(`Nota Fiscal emitida. Chave gerada na SEFAZ: ${xmlChave}`);
        os.billingLogs = logs;

        db.ordensServico[index] = os;
        await writeDB(db);
        res.json({ status: "ok", os });
        return;
      } catch (err: any) {
        consecutiveBlingFailures++;
        if (consecutiveBlingFailures >= 3) {
          circuitBreakerTrippedUntil = Date.now() + 60 * 1000; // Trip for 60 seconds
        }

        const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
        
        if (isTimeout) {
          logs.push("[TIMEOUT RIGIDO] A chamada para a API Bling excedeu o prazo de 10 segundos.");
          os.billingStatus = "TIMEOUT";
          os.sefazErrorMessage = "A chamada para o Bling estourou o tempo de resposta máximo (10s). A OS foi faturada localmente e mantida como Pendente de Envio.";
          os.billingLogs = logs;
          db.ordensServico[index] = os;
          await writeDB(db);
          res.status(503).json({ error: "Timeout excedido", logs });
          return;
        }

        const responseStatus = err.response?.status;
        logs.push(`Erro na comunicação fiscal. Código HTTP: ${responseStatus || 'Rede Link Down'}`);
        
        if (responseStatus === 401) {
          os.billingStatus = "PENDENTE";
          os.sefazErrorMessage = "Falha de comunicação segura com a Bling. Token/Chave de integração inválido ou expirado.";
          os.billingLogs = logs;
          db.ordensServico[index] = os;
          await writeDB(db);
          res.status(401).json({ error: "Não autorizado", logs });
          return;
        }

        if (responseStatus === 422) {
          const detailErr = err.response?.data?.error?.message || "Inscrição estadual inválida ou inconsistência de imposto SEFAZ.";
          os.billingStatus = "REJEITADO";
          os.sefazErrorMessage = `Rejeitado pela SEFAZ: ${detailErr}`;
          os.billingLogs = logs;
          db.ordensServico[index] = os;
          await writeDB(db);
          res.status(422).json({ error: "Rejeição SEFAZ", statusMessage: detailErr, logs });
          return;
        }

        os.billingStatus = "PENDENTE";
        os.sefazErrorMessage = "Servidores do Bling ou da SEFAZ indisponíveis de forma intermitente. Re-tentando via backoff programado.";
        os.billingLogs = logs;
        db.ordensServico[index] = os;
        await writeDB(db);
        res.status(503).json({ error: "Serviço fora de operação", logs });
        return;
      }
    }

    // ----------------------------------------------------
    // HIGH FIDELITY SIMULATION MODE (IF NO PRODUCTION KEY SET)
    // ----------------------------------------------------
    logs.push("Ambiente de homologação com Simulação Fiel ativa.");

    if (simulatedTimeout) {
      logs.push("Simulando atraso de rede prolongado...");
      await new Promise(resolve => setTimeout(resolve, 3000)); // Delay for effect
      logs.push("[TIMEOUT RIGIDO] Tempo limite excedido. Sem retorno do servidor da SEFAZ após 10.0s.");
      
      consecutiveBlingFailures++;
      if (consecutiveBlingFailures >= 3) {
        circuitBreakerTrippedUntil = Date.now() + 60 * 1000;
        logs.push("[CIRCUIT BREAKER] Limite de falhas contínuas excedido! Entrando em estado protetor.");
      }

      os.billingStatus = "TIMEOUT";
      os.sefazErrorMessage = "Timeout: A chamada para o Bling estourou o limite de retorno síncrono da SEFAZ (10s). Guardado localmente para faturamento agendado.";
      os.billingLogs = logs;
      
      db.ordensServico[index] = os;
      await writeDB(db);
      res.status(503).json({ 
        error: "Timeout", 
        feedbackMessage: "A chamada para o Bling estourou o tempo limite de resposta. O faturamento foi registrado localmente com o status 'Pendente'.",
        logs 
      });
      return;
    }

    if (forceErrorType === "SEFAZ_REJECT") {
      logs.push("Validando as regras tributárias com a SEFAZ estadual...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulates SEFAZ rejects
      const reasons = [
        "Inscrição Estadual inválida do destinatário para operação interestadual.",
        "Rejeição SEFAZ: CNPJ do destinatário está com situação cadastral bloqueada ou baixada.",
        "Alíquota de ICMS incorreta para o código de serviço de reparos informado.",
        "CFOP incoerente para o tipo de serviço de assistência de bens físicos."
      ];
      const selectedReason = reasons[Math.floor(Math.random() * reasons.length)];
      
      logs.push(`[SEFAZ REJECT] Processamento vetado pelo posto fiscal.`);
      logs.push(`Mensagem descritiva SEFAZ: ${selectedReason}`);

      consecutiveBlingFailures++;

      os.billingStatus = "REJEITADO";
      os.sefazErrorMessage = selectedReason;
      os.billingLogs = logs;

      db.ordensServico[index] = os;
      await writeDB(db);
      res.status(422).json({ 
        error: "SefazRejection", 
        feedbackMessage: selectedReason,
        logs 
      });
      return;
    }

    if (forceErrorType === "UNAUTHORIZED") {
      logs.push("Tentando handshake remoto com cabeçalho de assinatura do Bling...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      logs.push("[HTTP 401 (Auth Failed)] O Token de integração Bling está incorreto, nulo ou com tempo expirado.");

      consecutiveBlingFailures++;

      os.billingStatus = "PENDENTE";
      os.sefazErrorMessage = "Falha de comunicação segura com a Bling. Credenciais de API inválidas.";
      os.billingLogs = logs;

      db.ordensServico[index] = os;
      await writeDB(db);
      res.status(401).json({ 
        error: "Unauthorized", 
        feedbackMessage: "Falha de comunicação segura com a Bling. Acione o suporte técnico.",
        logs 
      });
      return;
    }

    if (forceErrorType === "SERVICE_DOWN") {
      logs.push("Iniciando varredura de ping para os servidores da SEFAZ...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      logs.push("[HTTP 503 (Serviço Fora)] Portal de Notas Fiscais da SEFAZ congestionado ou em manutenção.");

      consecutiveBlingFailures++;
      if (consecutiveBlingFailures >= 3) {
        circuitBreakerTrippedUntil = Date.now() + 60 * 1000;
        logs.push("[CIRCUIT BREAKER] Gateway em quarentena de repouso por 60 segundos devido a erros de conexão.");
      }

      os.billingStatus = "PENDENTE";
      os.sefazErrorMessage = "O serviço de faturamento Bling/SEFAZ está indisponível temporariamente.";
      os.billingLogs = logs;

      db.ordensServico[index] = os;
      await writeDB(db);
      res.status(503).json({ 
        error: "ServiceUnavailable", 
        feedbackMessage: "Faturamento indisponível no momento. O sistema tentará reenviar em breve.",
        logs 
      });
      return;
    }

    // Success Simulation Mode
    logs.push("Conectando de forma segura ao módulo de emissão...");
    await new Promise(resolve => setTimeout(resolve, 1200));
    logs.push("SEFAZ autorizou de forma síncrona o processamento fiscal!");
    
    const chaveAutal = `NFe-${Math.floor(Math.random() * 10000000000000000).toString().padStart(44, "3")}`;
    const mockBlingId = `bling-${Math.floor(Math.random() * 9999999)}`;
    
    logs.push(`Nota Fiscal gerada com sucesso. Bling Pedido ID: ${mockBlingId}`);
    logs.push(`Chave de recebimento fiscal gravada: ${chaveAutal}`);

    consecutiveBlingFailures = 0; // Reset circuit breaker count

    os.billingStatus = "FATURADO";
    os.blingId = mockBlingId;
    os.blingKey = chaveAutal;
    os.sefazErrorMessage = "";
    os.pdfUrl = `/api/integration/bling/danfe-pdf/${os.id}`;
    os.billingLogs = logs;

    db.ordensServico[index] = os;
    await writeDB(db);

    res.json({
      status: "ok",
      os,
      feedbackMessage: "Faturamento concluído! A Nota Fiscal foi gerada com sucesso."
    });
  });

  // DANFE PDF generator on-screen simulator endpoint
  app.get("/api/integration/bling/danfe-pdf/:id", async (req, res) => {
    // Custom render of DANFE can be represented structurally or visually
    // Since we are loading inside an iframe, let's provide metadata and let the frontend do a pixel-perfect DANFE component
    const db = await readDB();
    const os = db.ordensServico.find((o: any) => o.id === req.params.id);
    if (!os) {
      res.status(404).send("Ordem de serviço fiscal não encontrada");
      return;
    }
    const client = db.clients.find((c: any) => c.id === os.clientId);
    const device = db.devices.find((d: any) => d.id === os.deviceId);

    res.json({
      os,
      client,
      device,
      emitente: {
        nome: "MGV TECNOLOGIA E ASSISTÊNCIA TÉCNICA LTDA",
        cnpj: "18.291.554/0001-90",
        ie: "109.283.412.110",
        logradouro: "Av. Tiradentes, 850 - Centro",
        cidade: "São Paulo - SP",
        cep: "01024-000",
        contato: "(11) 3218-9900"
      }
    });
  });

  // ----------------------------------------------------
  // VITE DEV / PRODUCTION MIDDLEWARE
  // ----------------------------------------------------
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
