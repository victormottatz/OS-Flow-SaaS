import "dotenv/config";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000/api";
const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";

const OWNER_TOKEN = jwt.sign({ id: "test-admin", role: "OWNER" }, JWT_SECRET, { expiresIn: "1h" });
const TECH_TOKEN = jwt.sign({ id: "test-tech", role: "TECHNICIAN" }, JWT_SECRET, { expiresIn: "1h" });

async function api(path: string, token: string, method: string = "GET", body?: any) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runSmokeTest() {
  console.log("🔥 INICIANDO TESTE DE FUMAÇA DA RENTABILIDADE (PRIORIDADE 2) 🔥");

  let testOSId = "";
  let testClientId = "";
  let testDeviceId = "";
  let testPartId = "";
  let initialFlagState = false;

  try {
    // 0. Registrar/Atualizar Feature Flag no banco
    console.log("0️⃣ Preparando Feature Flag no banco...");
    const flagKey = "OS_PROFITABILITY_CALC";
    const flag = await prisma.featureFlag.findUnique({ where: { key: flagKey } });
    if (flag) {
      initialFlagState = flag.value;
    }
    // Ativa a flag para iniciar os testes
    await prisma.featureFlag.upsert({
      where: { key: flagKey },
      update: { value: true },
      create: { key: flagKey, value: true, description: "Flag de teste" }
    });
    console.log("✅ Feature Flag OS_PROFITABILITY_CALC ativada para o teste.");

    // 1. Obter ou Criar Cliente
    console.log("1️⃣ Preparando cliente de teste...");
    const client = await prisma.client.create({
      data: {
        name: "Cliente Teste Rentabilidade",
        cpfCnpj: "12345678901",
        phone: "11999999999",
        email: "teste@rentabilidade.com",
        address: "Rua Teste, 123"
      }
    });
    testClientId = client.id;
    console.log(`✅ Cliente criado ID: ${testClientId}`);

    // 2. Criar Equipamento
    console.log("2️⃣ Preparando equipamento de teste...");
    const device = await prisma.device.create({
      data: {
        clientId: testClientId,
        type: "Notebook",
        brand: "Dell",
        model: "Latitude",
        serialNumber: "SN-RENT-" + Date.now()
      }
    });
    testDeviceId = device.id;
    console.log(`✅ Equipamento criado ID: ${testDeviceId}`);

    // 3. Criar Peça com Custo
    console.log("3️⃣ Criando peça com custo no estoque...");
    const part = await prisma.part.create({
      data: {
        name: "Placa Mãe Dell Latitude Teste",
        code: "PART-TEST-RENT-" + Date.now(),
        stock: 5,
        cost: 350.00, // Custo: R$ 350.00
        price: 800.00, // Preço: R$ 800.00
        requiresSerial: false
      }
    });
    testPartId = part.id;
    console.log(`✅ Peça criada ID: ${testPartId} (Custo: R$ 350.00, Preço: R$ 800.00)`);

    // 4. Criar a Ordem de Serviço
    console.log("4️⃣ Abrindo Ordem de Serviço (OS)...");
    const osRes = await api("/ordens-servico", OWNER_TOKEN, "POST", {
      clientId: testClientId,
      deviceId: testDeviceId,
      reportedDefect: "Sem ligar"
    });
    if (!osRes.ok) throw new Error(`Falha ao criar OS: ${JSON.stringify(osRes.data)}`);
    testOSId = osRes.data.id;
    console.log(`✅ OS aberta ID: ${testOSId}`);

    // 5. Adicionar Peça e Horas de Técnico na OS
    console.log("5️⃣ Adicionando peças e horas de mão de obra à OS...");
    const updateRes = await api(`/ordens-servico/${testOSId}`, OWNER_TOKEN, "PUT", {
      diagnostic: "Placa em curto. Necessário substituição.",
      laborCost: 150.00, // Valor cobrado de mão de obra
      technicianLaborHours: 2, // 2 horas de trabalho do técnico
      technicianHourlyRate: 50.00, // Taxa de custo do técnico: R$ 50.00/h (Custo Mão de Obra = R$ 100.00)
      usedParts: [
        {
          partId: testPartId,
          name: part.name,
          quantity: 1,
          price: part.price
        }
      ]
    });
    if (!updateRes.ok) throw new Error(`Falha ao atualizar OS: ${JSON.stringify(updateRes.data)}`);
    console.log("✅ OS atualizada.");

    // Receita Total = Preço Peça (800.00) + Valor cobrado Mão de Obra (150.00) = R$ 950.00
    // Custos Operacionais = Custo Peça (350.00) + Custo Técnico (2 * 50.00 = 100.00) = R$ 450.00
    // Lucro Líquido Esperado = 950.00 - 450.00 = R$ 500.00
    // Margem de Lucro Esperada = (500.00 / 950.00) * 100 = 52.63%

    // 6. Testar Consulta como OWNER (Com flag ativada)
    console.log("6️⃣ Consultando OS logado como OWNER (Administrador)...");
    const getOwnerRes = await api("/ordens-servico", OWNER_TOKEN);
    if (!getOwnerRes.ok) throw new Error("Falha ao listar OSs como OWNER.");
    
    const osOwner = getOwnerRes.data.find((o: any) => o.id === testOSId);
    if (!osOwner) throw new Error("OS de teste não encontrada na listagem.");

    console.log("   Verificando campos de rentabilidade...");
    console.log("   OS do OWNER retornada:", JSON.stringify(osOwner, null, 2));
    if (osOwner.profitValue === undefined || osOwner.profitValue === null) {
      throw new Error("Lucro líquido (profitValue) não foi calculado ou exposto.");
    }
    if (osOwner.profitMarginPercent === undefined || osOwner.profitMarginPercent === null) {
      throw new Error("Margem de lucro (profitMarginPercent) não foi calculada ou exposta.");
    }
    if (osOwner.profitValue !== 500) {
      throw new Error(`Cálculo de lucro incorreto. Esperado: 500, Obtido: ${osOwner.profitValue}`);
    }
    console.log(`   ✅ Lucro líquido obtido: R$ ${osOwner.profitValue} (Esperado: 500)`);
    console.log(`   ✅ Margem obtida: ${osOwner.profitMarginPercent.toFixed(2)}% (Esperado: 52.63%)`);

    const usedPartOwner = osOwner.usedParts[0];
    if (!usedPartOwner || usedPartOwner.costSnapshot !== 350) {
      throw new Error(`costSnapshot não foi gravado ou retornado corretamente para OWNER: ${JSON.stringify(usedPartOwner)}`);
    }
    console.log(`   ✅ Custo unitário da peça retornado corretamente: R$ ${usedPartOwner.costSnapshot}`);
    
    if (osOwner.technicianHourlyRate !== 50) {
      throw new Error(`technicianHourlyRate não retornado corretamente para OWNER: ${osOwner.technicianHourlyRate}`);
    }
    console.log(`   ✅ Taxa horária do técnico retornada corretamente: R$ ${osOwner.technicianHourlyRate}`);

    // 7. Testar Consulta como TECHNICIAN (Devem ser omitidos os dados confidenciais)
    console.log("7️⃣ Consultando OS logado como TECHNICIAN (Técnico)...");
    const getTechRes = await api("/ordens-servico", TECH_TOKEN);
    if (!getTechRes.ok) throw new Error("Falha ao listar OSs como TECHNICIAN.");
    
    const osTech = getTechRes.data.find((o: any) => o.id === testOSId);
    if (!osTech) throw new Error("OS de teste não encontrada para o técnico.");

    console.log("   Verificando ocultação de dados sensíveis...");
    if (osTech.profitValue !== undefined || osTech.profitMarginPercent !== undefined || osTech.hasZeroCostParts !== undefined) {
      throw new Error("Vazamento de dados: Campos virtuais de rentabilidade expostos para perfil técnico!");
    }
    if (osTech.technicianHourlyRate !== null && osTech.technicianHourlyRate !== undefined) {
      throw new Error(`Vazamento de dados: Taxa horária do técnico exposta para perfil técnico: ${osTech.technicianHourlyRate}`);
    }
    const usedPartTech = osTech.usedParts[0];
    if (usedPartTech && usedPartTech.costSnapshot !== undefined) {
      throw new Error(`Vazamento de dados: Custo snapshot da peça exposto para perfil técnico: ${usedPartTech.costSnapshot}`);
    }
    console.log("   ✅ Ocultação de dados confidenciais validada com sucesso para técnicos.");

    // 8. Desativar Feature Flag e Testar como OWNER (Deve se comportar de forma sanitizada)
    console.log("8️⃣ Desativando a Feature Flag e testando consulta como OWNER...");
    await prisma.featureFlag.update({
      where: { key: flagKey },
      data: { value: false }
    });
    
    const getOwnerDisabledRes = await api("/ordens-servico", OWNER_TOKEN);
    if (!getOwnerDisabledRes.ok) throw new Error("Falha ao listar OSs com flag desativada.");
    
    const osOwnerDisabled = getOwnerDisabledRes.data.find((o: any) => o.id === testOSId);
    if (!osOwnerDisabled) throw new Error("OS de teste não encontrada com flag desativada.");

    console.log("   Verificando ocultação com Feature Flag desligada...");
    if (osOwnerDisabled.profitValue !== undefined || osOwnerDisabled.profitMarginPercent !== undefined) {
      throw new Error("Vazamento de dados: Rentabilidade exposta com a Feature Flag desativada!");
    }
    if (osOwnerDisabled.technicianHourlyRate !== null && osOwnerDisabled.technicianHourlyRate !== undefined) {
      throw new Error("Vazamento de dados: Taxa horária do técnico exposta com a Feature Flag desativada!");
    }
    const usedPartOwnerDisabled = osOwnerDisabled.usedParts[0];
    if (usedPartOwnerDisabled && usedPartOwnerDisabled.costSnapshot !== undefined) {
      throw new Error("Vazamento de dados: Custo de peça exposto com a Feature Flag desativada!");
    }
    console.log("   ✅ Feature Flag de desativação validada com sucesso (Módulo desligado).");

    console.log("\n🎉 TODOS OS TESTES DE RENTABILIDADE PASSARAM COM SUCESSO! 🎉");

  } catch (error: any) {
    console.error("\n❌ FALHA NO TESTE DE FUMAÇA DA RENTABILIDADE:", error.message);
    process.exit(1);
  } finally {
    // 9. Limpeza e restauração do banco de dados (Zero Data Loss / Governança)
    console.log("\n9️⃣ Iniciando faxina dos dados de teste...");
    
    // Restaurar a feature flag original
    await prisma.featureFlag.update({
      where: { key: "OS_PROFITABILITY_CALC" },
      data: { value: initialFlagState }
    });

    if (testOSId) {
      await prisma.ordemServico.delete({ where: { id: testOSId } }).catch(() => {});
    }
    if (testPartId) {
      await prisma.part.delete({ where: { id: testPartId } }).catch(() => {});
    }
    if (testDeviceId) {
      await prisma.device.delete({ where: { id: testDeviceId } }).catch(() => {});
    }
    if (testClientId) {
      await prisma.client.delete({ where: { id: testClientId } }).catch(() => {});
    }
    
    console.log("🧹 Faxina de banco concluída. Sistema restaurado.");
    await prisma.$disconnect();
  }
}

runSmokeTest();
