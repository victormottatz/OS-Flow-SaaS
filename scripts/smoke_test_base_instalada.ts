import "dotenv/config";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000/api";
const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";

const OWNER_TOKEN = jwt.sign({ id: "test-admin", role: "OWNER" }, JWT_SECRET, { expiresIn: "1h" });

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
  console.log("🔥 INICIANDO TESTE DE FUMAÇA DA BASE INSTALADA (PRIORIDADE 3) 🔥");

  let testClientId = "";
  let testDeviceId = "";
  let testPartId = "";
  let testOSId1 = "";
  let testOSId2 = "";
  let testOSId3 = "";
  let initialFlagState = false;

  try {
    // 0. Preparar Feature Flag no banco
    console.log("0️⃣ Preparando Feature Flag no banco...");
    const flagKey = "CLIENT_360_AND_BASE_INSTALADA";
    const flag = await prisma.featureFlag.findUnique({ where: { key: flagKey } });
    if (flag) {
      initialFlagState = flag.value;
    }
    await prisma.featureFlag.upsert({
      where: { key: flagKey },
      update: { value: true },
      create: { key: flagKey, value: true, description: "Flag de teste P3" }
    });
    console.log("✅ Feature Flag CLIENT_360_AND_BASE_INSTALADA ativada para o teste.");

    // 1. Criar Cliente
    console.log("1️⃣ Criando cliente de teste...");
    const client = await prisma.client.create({
      data: {
        name: "Cliente Teste Base Instalada",
        cpfCnpj: "98765432100",
        phone: "11988888888",
        email: "teste360@base.com",
        address: "Av Paulista, 1000"
      }
    });
    testClientId = client.id;
    console.log(`✅ Cliente criado ID: ${testClientId}`);

    // 2. Criar Equipamento Incompleto (Legado)
    console.log("2️⃣ Criando equipamento legado incompleto...");
    const device = await prisma.device.create({
      data: {
        clientId: testClientId,
        type: "Notebook",
        brand: "Indefinido",
        model: "Indefinido",
        serialNumber: "Sem Série",
        description: "Equipamento legado importado."
      }
    });
    testDeviceId = device.id;
    console.log(`✅ Equipamento legado criado ID: ${testDeviceId}`);

    // 3. Criar Peça com Serial Obrigatório
    console.log("3️⃣ Criando peça que exige número de série...");
    const part = await prisma.part.create({
      data: {
        name: "SSD NVMe 1TB Teste Serial",
        code: "PART-SSD-SERIAL-" + Date.now(),
        stock: 10,
        cost: 200.00,
        price: 450.00,
        requiresSerial: true // <--- Exige serial!
      }
    });
    testPartId = part.id;
    console.log(`✅ Peça serializada criada ID: ${testPartId}`);

    // 4. Abrir OS para o Equipamento Incompleto
    console.log("4️⃣ Abrindo Ordem de Serviço (OS)...");
    const osRes1 = await api("/ordens-servico", OWNER_TOKEN, "POST", {
      clientId: testClientId,
      deviceId: testDeviceId,
      reportedDefect: "SSD queimado"
    });
    if (!osRes1.ok) throw new Error(`Falha ao criar OS: ${JSON.stringify(osRes1.data)}`);
    testOSId1 = osRes1.data.id;
    console.log(`✅ OS aberta ID: ${testOSId1}`);

    // 5. Testar Caso 1: Tentar alocar peça serializada na OS sem higienizar o ativo
    console.log("5️⃣ Testando bloqueio ao alocar peça com série em ativo legado...");
    const updateRes = await api(`/ordens-servico/${testOSId1}`, OWNER_TOKEN, "PUT", {
      diagnostic: "Substituição do SSD",
      laborCost: 100.00,
      usedParts: [
        {
          partId: testPartId,
          name: part.name,
          quantity: 1,
          price: part.price,
          serialNumber: "SN-SSD-999" // Fornece o serial da peça
        }
      ]
    });
    if (updateRes.status !== 422 || updateRes.data.code !== "DEVICE_INCOMPLETE") {
      throw new Error(`O backend deveria ter bloqueado com DEVICE_INCOMPLETE. Status obtido: ${updateRes.status}, Corpo: ${JSON.stringify(updateRes.data)}`);
    }
    console.log("✅ Bloqueio de alocação de peças em ativo legado funcionou com sucesso!");

    // 6. Testar Caso 2: Tentar mudar o status da OS para FINALIZADO sem higienizar
    console.log("6️⃣ Testando bloqueio de finalização de OS em ativo legado...");
    // Mockar início do teste de estresse para não bater no bloqueio de garantia
    await prisma.ordemServico.update({
      where: { id: testOSId1 },
      data: { 
        stressTestStartedAt: new Date(Date.now() - 40 * 60 * 1000), // Iniciou a 40min (estresse cumprido)
        diagnostic: "Laudo técnico de teste do SSD concluído com sucesso.", // Laudo técnico preenchido
        laborCost: 150.00,
        totalCost: 150.00
      }
    });

    const statusRes = await api(`/ordens-servico/${testOSId1}/status`, OWNER_TOKEN, "PUT", {
      status: "FINALIZADO"
    });
    if (statusRes.status !== 422 || statusRes.data.code !== "DEVICE_INCOMPLETE") {
      throw new Error(`O backend deveria ter bloqueado a finalização com DEVICE_INCOMPLETE. Status obtido: ${statusRes.status}, Corpo: ${JSON.stringify(statusRes.data)}`);
    }
    console.log("✅ Bloqueio de status em ativo legado funcionou com sucesso!");

    // 7. Testar Caso 3: Higienizar o dispositivo chamando o PUT
    console.log("7️⃣ Higienizando e convertendo o ativo legado via PUT /api/devices/:id...");
    const cleanRes = await api(`/devices/${testDeviceId}`, OWNER_TOKEN, "PUT", {
      type: "Notebook",
      brand: "Apple",
      model: "MacBook Pro M1",
      serialNumber: "SN-MAC-PRO-12345",
      description: "Equipamento higienizado. Bateria com marcas estéticas."
    });
    if (!cleanRes.ok) {
      throw new Error(`Falha ao higienizar dispositivo: ${JSON.stringify(cleanRes.data)}`);
    }
    console.log("✅ Ativo convertido com sucesso para a Base Instalada definitiva!");

    // 8. Testar Caso 4: Refazer a finalização e validar se agora o backend permite
    console.log("8️⃣ Testando finalização de OS após o ativo estar higienizado...");
    const statusCleanRes = await api(`/ordens-servico/${testOSId1}/status`, OWNER_TOKEN, "PUT", {
      status: "FINALIZADO"
    });
    if (!statusCleanRes.ok) {
      throw new Error(`A finalização deveria ter sido aceita após higienização. Resposta: ${JSON.stringify(statusCleanRes.data)}`);
    }
    console.log("✅ OS finalizada com sucesso após a conversão do ativo!");

    // 9. Testar Caso 5: Motor de Recorrência
    console.log("9️⃣ Testando Motor de Recorrência (Virtual recurrentAlert)...");
    // Abre segunda OS para o mesmo equipamento (janela de 90 dias)
    const osRes2 = await api("/ordens-servico", OWNER_TOKEN, "POST", {
      clientId: testClientId,
      deviceId: testDeviceId,
      reportedDefect: "Superaquecimento"
    });
    testOSId2 = osRes2.data.id;

    // Abre terceira OS para o mesmo equipamento (janela de 90 dias)
    const osRes3 = await api("/ordens-servico", OWNER_TOKEN, "POST", {
      clientId: testClientId,
      deviceId: testDeviceId,
      reportedDefect: "Tela piscando"
    });
    testOSId3 = osRes3.data.id;

    // Listar as OSs e verificar se elas trazem a flag de reincidência virtual
    const listRes = await api("/ordens-servico", OWNER_TOKEN);
    if (!listRes.ok) throw new Error("Falha ao listar OSs.");
    
    const os1 = listRes.data.find((o: any) => o.id === testOSId1);
    const os2 = listRes.data.find((o: any) => o.id === testOSId2);
    const os3 = listRes.data.find((o: any) => o.id === testOSId3);

    if (!os1.recurrentAlert || !os2.recurrentAlert || !os3.recurrentAlert) {
      throw new Error(`As OSs do mesmo dispositivo em 90 dias deveriam conter recurrentAlert: ${JSON.stringify({ os1: os1?.recurrentAlert, os2: os2?.recurrentAlert, os3: os3?.recurrentAlert })}`);
    }
    if (os3.recurrentAlert.count !== 3) {
      throw new Error(`Contagem de reincidência incorreta. Esperado: 3, Obtido: ${os3.recurrentAlert.count}`);
    }
    console.log(`   ✅ Alerta de Recorrência detectado: Retornou ${os3.recurrentAlert.count} vezes em 90 dias!`);
    console.log(`   ✅ Números de OSs anteriores vinculados no alerta: ${os3.recurrentAlert.previousOsNumbers.join(", ")}`);

    // 10. Testar Caso 6: Obter Visão 360 do Cliente
    console.log("🔟 Chamando a API de Visão 360º do Cliente...");
    const client360Res = await api(`/clients/${testClientId}/360`, OWNER_TOKEN);
    if (!client360Res.ok) throw new Error(`Falha ao obter Visão 360: ${JSON.stringify(client360Res.data)}`);

    const data360 = client360Res.data;
    if (data360.client.id !== testClientId) {
      throw new Error("ID do cliente retornado incorreto.");
    }
    if (data360.devices.length !== 1 || data360.devices[0].id !== testDeviceId) {
      throw new Error("Lista de dispositivos de Base Instalada incorreta.");
    }
    if (data360.orders.length !== 3) {
      throw new Error(`Histórico de ordens de serviço incorreto. Esperado: 3, Obtido: ${data360.orders.length}`);
    }
    console.log(`   ✅ Visão 360 retornada com sucesso!`);
    console.log(`   ✅ Parque instalado do cliente contendo ${data360.devices.length} ativo(s) higienizado(s).`);
    console.log(`   ✅ Faturamento total do cliente na Visão 360º: R$ ${data360.totalSpent}`);

    console.log("\n🎉 TODOS OS TESTES DE BASE INSTALADA E VISÃO 360º PASSARAM COM SUCESSO! 🎉");

  } catch (error: any) {
    console.error("\n❌ FALHA NO TESTE DE FUMAÇA DA BASE INSTALADA:", error.message);
    process.exit(1);
  } finally {
    // 11. Faxina e restauração
    console.log("\n🧹 Iniciando faxina dos dados de teste...");
    await prisma.featureFlag.update({
      where: { key: "CLIENT_360_AND_BASE_INSTALADA" },
      data: { value: initialFlagState }
    });

    if (testOSId3) await prisma.ordemServico.delete({ where: { id: testOSId3 } }).catch(() => {});
    if (testOSId2) await prisma.ordemServico.delete({ where: { id: testOSId2 } }).catch(() => {});
    if (testOSId1) await prisma.ordemServico.delete({ where: { id: testOSId1 } }).catch(() => {});
    if (testPartId) await prisma.part.delete({ where: { id: testPartId } }).catch(() => {});
    if (testDeviceId) await prisma.device.delete({ where: { id: testDeviceId } }).catch(() => {});
    if (testClientId) await prisma.client.delete({ where: { id: testClientId } }).catch(() => {});

    console.log("🧹 Faxina de banco concluída.");
    await prisma.$disconnect();
  }
}

runSmokeTest();
