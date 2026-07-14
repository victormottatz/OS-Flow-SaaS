import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../database/prisma";
import { UserRole } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
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
        createdAt: true
      }
    });
    res.json(users.map(u => ({
      ...u,
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
}

export const authController = new AuthController();
