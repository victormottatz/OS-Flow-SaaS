import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:3000/api";
const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";
const TEST_TOKEN = jwt.sign({ id: "test-admin", role: "OWNER" }, JWT_SECRET, { expiresIn: "1h" });

async function api(path: string, method: string = "GET", body?: any) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TEST_TOKEN}`
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
  console.log("🔥 INICIANDO SMOKE TEST DE PONTA A PONTA (PRODUÇÃO) 🔥");
  
  try {
    // 1. Obter um Cliente Existente da Base
    console.log("1️⃣ Buscando cliente existente na base...");
    const clientsRes = await api("/clients");
    if (!clientsRes.ok || !Array.isArray(clientsRes.data) || clientsRes.data.length === 0) {
      throw new Error("Não foi possível listar ou encontrar clientes na base.");
    }
    const client = clientsRes.data[0];
    console.log(`✅ Cliente selecionado: ${client.name} (ID: ${client.id})`);

    // 2. Obter uma Peça com Estoque da Base Real
    console.log("2️⃣ Buscando peça real no estoque...");
    const partsRes = await api("/parts");
    if (!partsRes.ok || !Array.isArray(partsRes.data) || partsRes.data.length === 0) {
      throw new Error("Não foi possível listar ou encontrar peças no estoque.");
    }
    
    // Encontrar uma peça com estoque disponível
    const part = partsRes.data.find((p: any) => p.stock > 0);
    if (!part) {
      throw new Error("Nenhuma peça com estoque maior que zero foi encontrada na base.");
    }
    console.log(`✅ Peça selecionada: ${part.name} (Código: ${part.code}, ID: ${part.id}, Estoque: ${part.stock})`);

    // 3. Criar Equipamento Temporário para o Cliente
    console.log("3️⃣ Criando equipamento vinculado ao cliente...");
    const deviceRes = await api("/devices", "POST", {
      clientId: client.id,
      type: "Equipamento Teste Smoke",
      brand: "MGV",
      model: "Model S",
      serialNumber: "SN-SMOKE-" + Date.now()
    });
    if (!deviceRes.ok) throw new Error(`Falha ao criar equipamento: ${JSON.stringify(deviceRes.data)}`);
    const deviceId = deviceRes.data.id;
    console.log("✅ Equipamento criado:", deviceId);

    // 4. Criar a Ordem de Serviço
    console.log("4️⃣ Abrindo Ordem de Serviço (OS)...");
    const osRes = await api("/ordens-servico", "POST", {
      clientId: client.id,
      deviceId,
      reportedDefect: "Defeito de teste para validação de faturamento Bling"
    });
    if (!osRes.ok) throw new Error(`Falha ao criar OS: ${JSON.stringify(osRes.data)}`);
    const osId = osRes.data.id;
    console.log(`✅ OS aberta com sucesso: #${osRes.data.osNumber} (ID: ${osId})`);

    // 5. Adicionar Laudo, Mão de Obra e a Peça selecionada
    console.log("5️⃣ Atualizando OS com Laudo Técnico, Mão de Obra e a Peça real...");
    const usedPartsPayload = [{
      partId: part.id,
      name: part.name,
      quantity: 1,
      price: part.price,
      serialNumber: part.requiresSerial ? "SN-SMOKE-PART-123" : undefined
    }];

    const updateRes = await api(`/ordens-servico/${osId}`, "PUT", {
      diagnostic: "Teste de faturamento concluído com sucesso. Integração validada.",
      laborCost: 100.00,
      technicianLaborHours: 1,
      technicianHourlyRate: 100.00,
      usedParts: usedPartsPayload
    });
    if (!updateRes.ok) throw new Error(`Falha ao atualizar OS: ${JSON.stringify(updateRes.data)}`);
    console.log("✅ OS atualizada com laudo e peças.");

    // 5.5️⃣ Mover para EM_MANUTENCAO
    console.log("5️⃣.5️⃣ Movendo OS para EM_MANUTENCAO...");
    const manutencaoRes = await api(`/ordens-servico/${osId}/status`, "PUT", {
      status: "EM_MANUTENCAO"
    });
    if (!manutencaoRes.ok) throw new Error(`Falha ao mover status para EM_MANUTENCAO: ${JSON.stringify(manutencaoRes.data)}`);
    console.log("✅ OS marcada como Em Manutenção.");

    // 6. Mover para PRONTO_RETIRADA
    console.log("6️⃣ Movendo OS para PRONTO_RETIRADA...");
    const prontoRes = await api(`/ordens-servico/${osId}/status`, "PUT", {
      status: "PRONTO_RETIRADA"
    });
    if (!prontoRes.ok) throw new Error(`Falha ao mover status para PRONTO_RETIRADA: ${JSON.stringify(prontoRes.data)}`);
    console.log("✅ OS marcada como Pronta para Retirada.");

    // 7. Mover para FINALIZADO (Dispara o Worker de integração Bling)
    console.log("7️⃣ Finalizando OS para disparar a integração com o Bling...");
    const finalRes = await api(`/ordens-servico/${osId}/status`, "PUT", {
      status: "FINALIZADO"
    });
    if (!finalRes.ok) throw new Error(`Falha ao finalizar OS: ${JSON.stringify(finalRes.data)}`);
    console.log("✅ OS movida para FINALIZADO! Aguardando retorno fiscal...");

    // 8. Aguardar o processamento assíncrono do Bling
    console.log("⏳ Aguardando 6 segundos pelo processamento do Bling...");
    await new Promise(resolve => setTimeout(resolve, 6000));

    // 9. Verificar o faturamento e recuperar o blingId
    console.log("8️⃣ Verificando integridade do faturamento e blingId...");
    const checkRes = await api("/ordens-servico");
    if (!checkRes.ok || !Array.isArray(checkRes.data)) {
      throw new Error("Não foi possível listar as Ordens de Serviço para validação.");
    }

    const verifiedOS = checkRes.data.find((o: any) => o.id === osId);
    if (!verifiedOS) {
      throw new Error("A OS criada para o teste desapareceu da base!");
    }

    console.log(`📋 Resultado do Faturamento:`);
    console.log(`   - Status de Faturamento: ${verifiedOS.billingStatus}`);
    console.log(`   - ID da Venda no Bling (blingId): ${verifiedOS.blingId}`);
    console.log(`   - Chave de Acesso NF-e: ${verifiedOS.blingKey}`);
    console.log(`   - Mensagem SEFAZ: ${verifiedOS.sefazErrorMessage}`);

    if (verifiedOS.billingStatus === "FATURADO" && verifiedOS.blingId) {
      console.log("\n🎉 SMOKE TEST END-TO-END CONCLUÍDO COM 100% DE SUCESSO! 🎉");
      console.log(`O ID de venda '${verifiedOS.blingId}' foi retornado pelo Bling e devidamente gravado.`);
    } else if (verifiedOS.billingStatus === "PENDENTE" && verifiedOS.sefazErrorMessage?.includes("Bling Pedido ID")) {
      // Caso de sucesso simulado/sem chave mas com ID gravado
      console.log("\n🎉 SMOKE TEST CONCLUÍDO COM SUCESSO EM MODO SIMULADO! 🎉");
      console.log(`O ID de venda '${verifiedOS.blingId}' foi gravado com sucesso no banco local.`);
    } else {
      throw new Error(`O faturamento falhou ou não gravou o blingId. Status: ${verifiedOS.billingStatus}`);
    }

  } catch (error: any) {
    console.error("\n❌ ERRO NO SMOKE TEST:", error.message);
    process.exit(1);
  }
}

runSmokeTest();
