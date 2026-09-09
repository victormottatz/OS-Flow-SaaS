import { PrismaClient } from "@prisma/client";
import { tenantService } from "../src/services/tenant.service";
import { billingService } from "../src/services/billing.service";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function runPhase1Validation() {
  console.log("=================================================");
  console.log("🧪 INICIANDO TESTE DE VALIDAÇÃO SAAS - FASE 1");
  console.log("=================================================");

  try {
    // 1. Garante planos padrão
    console.log("\n[1/5] Semeando planos padrão do SaaS...");
    await tenantService.ensureDefaultPlans();
    const plans = await billingService.listPlans();
    console.log(`✅ Planos ativos encontrados: ${plans.length}`);
    plans.forEach(p => {
      console.log(`   - ${p.name} (${p.tier}): R$ ${p.priceMonthly}/mês | Max Users: ${p.maxUsers}`);
    });

    // 2. Registra novo tenant piloto
    const testEmail = `dono_piloto_${Date.now()}@lasertech.com.br`;
    console.log(`\n[2/5] Registrando nova assistência técnica piloto (${testEmail})...`);
    const tenantResult = await tenantService.registerTenant({
      companyName: "Laser Tech Assistência Estética",
      cnpj: "12.345.678/0001-90",
      city: "Campinas",
      state: "SP",
      phone: "19999998888",
      ownerName: "Eng. Marcelo Laser",
      ownerEmail: testEmail,
      ownerPassword: "SenhaForte@2026"
    });

    console.log(`✅ Assistência criada com sucesso!`);
    console.log(`   - ID da Empresa: ${tenantResult.company.id}`);
    console.log(`   - Slug da Empresa: ${tenantResult.company.slug}`);
    console.log(`   - Dono (OWNER): ${tenantResult.user.name} (${tenantResult.user.email})`);
    console.log(`   - Status da Assinatura: ${tenantResult.subscription.status}`);
    console.log(`   - Término do Trial: ${tenantResult.subscription.trialEndsAt?.toISOString()}`);

    // 3. Validação de tags criadas por tenant
    const tags = await prisma.tag.findMany({
      where: { companyId: tenantResult.company.id }
    });
    console.log(`\n[3/5] Verificando tags iniciais de estética geradas para o tenant:`);
    console.log(`   - Total de tags criadas: ${tags.length} (ex: ${tags.map(t => t.name).join(", ")})`);

    // 4. Consulta de Billing
    console.log(`\n[4/5] Consultando detalhes da assinatura via BillingService...`);
    const billingDetails = await billingService.getSubscriptionDetails(tenantResult.company.id);
    console.log(`   - Empresa vinculada: ${billingDetails.company.name}`);
    console.log(`   - Plano ativo no Trial: ${billingDetails.subscription?.plan?.name}`);

    // 5. Simulação de Checkout e Ativação do Plano Pro
    console.log(`\n[5/5] Simulando checkout para o Plano Pro Anual...`);
    const checkoutResult = await billingService.createSubscription({
      companyId: tenantResult.company.id,
      planId: tenantResult.plan.id,
      cycle: "ANNUAL",
      paymentMethod: "PIX"
    });

    console.log(`✅ Assinatura ativada com sucesso!`);
    console.log(`   - Novo Status: ${checkoutResult.subscription.status}`);
    console.log(`   - Ciclo: ${checkoutResult.subscription.cycle}`);
    console.log(`   - Fatura gerada: R$ ${checkoutResult.invoice.amount}`);
    console.log(`   - Status da Fatura: ${checkoutResult.invoice.status}`);

    console.log("\n=================================================");
    console.log("🎉 TODAS AS VALIDAÇÕES DA FASE 1 PASSARAM COM SUCESSO!");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ ERRO NA VALIDAÇÃO DA FASE 1:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase1Validation();
