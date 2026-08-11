import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../database/prisma";
import { UserRole } from "../types";
import { supabaseStorageService } from "../services/supabaseStorage";
import { diskStorageService } from "../services/diskStorage";

// Decide dinamicamente qual storage utilizar com base no arquivo .env
const storageService = process.env.STORAGE_TYPE === "supabase" ? supabaseStorageService : diskStorageService;



const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      return;
    }
    
    try {
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
          phone: user.phone || "",
          avatarUrl: user.avatarUrl || "",
          bio: user.bio || "",
          createdAt: user.createdAt.toISOString()
        }
      });
    } catch (err: any) {
      console.error("[Auth Login Error]:", err);
      res.status(503).json({ error: "Falha ao conectar com o banco de dados. Verifique a conexão do servidor ou se o Supabase está ativo no painel." });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "Todos os campos (nome, e-mail, senha, perfil) são obrigatórios." });
      return;
    }

    const userCount = await prisma.user.count();

    if (userCount > 0) {
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
        phone: newUser.phone || "",
        avatarUrl: newUser.avatarUrl || "",
        bio: newUser.bio || "",
        createdAt: newUser.createdAt.toISOString()
      }
    });
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true
      }
    });
    res.json(users.map(u => ({
      ...u,
      phone: u.phone || "",
      avatarUrl: u.avatarUrl || "",
      bio: u.bio || "",
      createdAt: u.createdAt.toISOString()
    })));
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }
    
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
  }

  async getUserPermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { permissions: true }
      });
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado." });
        return;
      }
      res.json({ permissions: user.permissions || [] });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar permissões do usuário." });
    }
  }

  async updateUserPermissions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      res.status(400).json({ error: "O campo permissions deve ser um array." });
      return;
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { permissions }
      });
      res.json({ message: "Permissões atualizadas com sucesso.", permissions: updated.permissions });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar permissões do usuário." });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.headers["x-user-id"] as string;
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatarUrl: true,
          bio: true,
          createdAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado." });
        return;
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        bio: user.bio || "",
        createdAt: user.createdAt.toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar perfil." });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.headers["x-user-id"] as string;
    const { name, email, phone, avatarUrl, bio, currentPassword, newPassword } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado." });
        return;
      }

      const updateData: any = {};

      if (name) {
        updateData.name = name;
      }

      if (email && email.toLowerCase() !== user.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        });
        if (emailExists) {
          res.status(409).json({ error: "Este e-mail já está sendo utilizado por outro usuário." });
          return;
        }
        
        if (!currentPassword) {
          res.status(400).json({ error: "Para alterar o e-mail, insira sua senha atual por segurança." });
          return;
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
          res.status(401).json({ error: "Senha atual incorreta." });
          return;
        }

        updateData.email = email.toLowerCase();
      }

      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({ error: "Para alterar a senha, insira sua senha atual por segurança." });
          return;
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
          res.status(401).json({ error: "Senha atual incorreta." });
          return;
        }

        updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      updateData.phone = phone !== undefined ? phone : user.phone;
      updateData.bio = bio !== undefined ? bio : user.bio;

      let finalAvatarUrl = user.avatarUrl;
      if (avatarUrl !== undefined) {
        if (avatarUrl === "" || avatarUrl === null) {
          if (user.avatarUrl) {
            await storageService.deleteAvatar(user.avatarUrl);
          }
          finalAvatarUrl = null;
        } else if (avatarUrl.startsWith("data:image/")) {
          if (user.avatarUrl) {
            await storageService.deleteAvatar(user.avatarUrl);
          }
          try {
            finalAvatarUrl = await storageService.uploadAvatar(userId, avatarUrl);
          } catch (uploadErr: any) {
            console.error("[Profile Update Image Upload Error]:", uploadErr);
            res.status(400).json({ error: uploadErr.message || "Falha ao carregar a foto de perfil no storage do servidor." });
            return;
          }
        } else {
          finalAvatarUrl = avatarUrl;
        }
      }
      updateData.avatarUrl = finalAvatarUrl;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatarUrl: true,
          bio: true,
          createdAt: true
        }
      });

      res.json({
        message: "Perfil atualizado com sucesso!",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone || "",
          avatarUrl: updatedUser.avatarUrl || "",
          bio: updatedUser.bio || "",
          createdAt: updatedUser.createdAt.toISOString()
        }
      });
    } catch (err) {
      console.error("[Profile Update Error]:", err);
      res.status(500).json({ error: "Erro ao atualizar perfil." });
    }
  }

  async impersonate(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "O ID do usuário destino é obrigatório." });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: "Usuário destino não encontrado." });
        return;
      }

      // Impede simular outro OWNER por motivos de segurança, a menos que o solicitante seja OWNER
      const requesterRole = req.headers["x-user-role"] as string;
      if (user.role === UserRole.OWNER && requesterRole !== UserRole.OWNER) {
        res.status(403).json({ error: "Acesso negado. Apenas o Dono pode simular outro Dono." });
        return;
      }

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
          phone: user.phone || "",
          avatarUrl: user.avatarUrl || "",
          bio: user.bio || "",
          createdAt: user.createdAt.toISOString()
        }
      });
    } catch (err: any) {
      console.error("[Auth Impersonate Error]:", err);
      res.status(500).json({ error: "Erro interno no servidor ao simular perfil." });
    }
  }
}

export const authController = new AuthController();
