import prisma from "../database/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "../types";

export interface CreateTenantDTO {
  companyName: string;
  fantasyName?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export class TenantService {
  /**
   * Garante a existência dos planos padrão no banco de dados
   */
  async ensureDefaultPlans() {
    const plansCount = await prisma.plan.count();
    if (plansCount > 0) return;

    await prisma.plan.createMany({
      data: [
        {
          name: "Plano Starter",
          tier: "STARTER",
          description: "Ideal para bancadas individuais e pequenas oficinas.",
          priceMonthly: 197.0,
          priceAnnual: 1970.0,
          maxUsers: 2,
          maxOrdersPerMonth: 50,
          features: ["Kanban de OS", "Laudos em PDF", "WhatsApp Integrado", "Até 2 Usuários"],
          active: true
        },
        {
          name: "Plano Pro",
          tier: "PRO",
          description: "O mais completo para assistências de estética e eletromédicos.",
          priceMonthly: 397.0,
          priceAnnual: 3970.0,
          maxUsers: 6,
          maxOrdersPerMonth: 9999,
          features: [
            "Tudo do Starter",
            "Faturamento Bifásico Bling (NF-e + NFS-e)",
            "Validador Fiscal e NCM",
            "Equipamento Reserva / Backup",
            "Até 6 Usuários"
          ],
          active: true
        },
        {
          name: "Plano Enterprise",
          tier: "ENTERPRISE",
          description: "Para grandes autorizadas, redes e distribuidores.",
          priceMonthly: 790.0,
          priceAnnual: 7900.0,
          maxUsers: 999,
          maxOrdersPerMonth: 99999,
          features: [
            "Tudo do Pro",
            "Usuários Ilimitados",
            "Multi-filiais",
            "API Aberta",
            "Gerente de Contas Dedicado"
          ],
          active: true
        }
      ]
    });
  }

  /**
   * Registra uma nova assistência técnica com isolamento total e período de Trial
   */
  async registerTenant(data: CreateTenantDTO) {
    await this.ensureDefaultPlans();

    // 1. Gera slug único para a empresa
    const baseSlug = data.companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 2. Busca o Plano PRO para aplicar os 14 dias de Trial
    const proPlan = await prisma.plan.findUnique({
      where: { tier: "PRO" }
    });

    if (!proPlan) {
      throw new Error("Plano padrão não encontrado. Execute a semente de planos.");
    }

    // 3. Calcula período de Trial (14 dias)
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(trialEndsAt);

    // 4. Criação atômica via transação
    const result = await prisma.$transaction(async (tx) => {
      // 4.1 Cria a Company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          cnpj: data.cnpj || null,
          slug,
          phone: data.phone || null,
          email: data.email || data.ownerEmail,
          city: data.city || null,
          state: data.state || null,
          active: true
        }
      });

      // 4.2 Cria a Assinatura Trial
      const subscription = await tx.subscription.create({
        data: {
          companyId: company.id,
          planId: proPlan.id,
          status: "TRIAL",
          cycle: "MONTHLY",
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd
        }
      });

      // 4.3 Cria o Usuário OWNER da empresa
      const passwordHash = await bcrypt.hash(data.ownerPassword, 10);
      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.ownerEmail.toLowerCase(),
          passwordHash,
          role: UserRole.OWNER,
          companyId: company.id,
          permissions: ["*"] // Acesso total no escopo do tenant
        }
      });

      // 4.4 Cria tags padrão do sistema para o novo tenant
      await tx.tag.createMany({
        data: [
          { name: "Laser Diodo", colorHex: "#3B82F6", companyId: company.id, scope: "DEVICE" },
          { name: "Criolipólise", colorHex: "#06B6D4", companyId: company.id, scope: "DEVICE" },
          { name: "Ultraformer / HIFU", colorHex: "#8B5CF6", companyId: company.id, scope: "DEVICE" },
          { name: "Urgente", colorHex: "#EF4444", companyId: company.id, scope: "ORDEM_SERVICO" },
          { name: "Garantia", colorHex: "#10B981", companyId: company.id, scope: "ORDEM_SERVICO" }
        ]
      });

      return { company, user, subscription, plan: proPlan };
    });

    return result;
  }
}

export const tenantService = new TenantService();
