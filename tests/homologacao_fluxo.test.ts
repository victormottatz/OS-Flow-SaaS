import jwt from "jsonwebtoken";

// Configurações do teste
const BASE_URL = `http://localhost:${process.env.PORT || 3001}/api`;
const JWT_SECRET = process.env.JWT_SECRET || "osflow_super_secure_jwt_secret_key_2026!";
const TEST_TOKEN = jwt.sign({ id: "1b499d3a-84c6-4958-a40b-50471e3e2569", role: "OWNER", companyId: "e36d43d9-8f59-4f90-b497-cb0942265b52" }, JWT_SECRET, { expiresIn: "1h" });

// Helper para chamadas
async function api(path: string, method: string = "GET", body?: any) {
  const url = `${BASE_URL}${path}`;
  
  // Usar fetch nativo do Node 18+ ou superior
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

function generateValidCPF() {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const n = Array.from({ length: 9 }, () => rnd(9));
  let d1 = n.reduce((acc, val, idx) => acc + val * (10 - idx), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  let d2 = [...n, d1].reduce((acc, val, idx) => acc + val * (11 - idx), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return [...n, d1, d2].join("");
}

async function runTests() {
  console.log("🚀 Iniciando Teste de Homologação End-to-End (MGV Assistência Técnica)");
  
  try {
    // 1. Criar Cliente
    console.log("1️⃣ Criando Cliente Fictício...");
    const cpfUnico = generateValidCPF();
    const clientRes = await api("/clients", "POST", {
      name: "João da Silva Teste",
      cpfCnpj: String(cpfUnico),
      phone: "11999999999",
      email: "joao@teste.com",
      address: "Rua Teste, 123"
    });
    
    if (!clientRes.ok) throw new Error(`Falha ao criar cliente: ${JSON.stringify(clientRes.data)}`);
    const clientId = clientRes.data.client.id;
    console.log("✅ Cliente criado:", clientId);

    // 2. Criar Equipamento
    console.log("2️⃣ Criando Equipamento...");
    const deviceRes = await api("/devices", "POST", {
      clientId,
      type: "Smartphone",
      brand: "Apple",
      model: "iPhone 13 Pro",
      serialNumber: "SN123456789"
    });
    
    if (!deviceRes.ok) throw new Error(`Falha ao criar equipamento: ${JSON.stringify(deviceRes.data)}`);
    const deviceId = deviceRes.data.id;
    console.log("✅ Equipamento criado:", deviceId);

    // 3. Criar Ordem de Serviço
    console.log("3️⃣ Abrindo Ordem de Serviço (OS)...");
    const osRes = await api("/ordens-servico", "POST", {
      clientId,
      deviceId,
      reportedDefect: "Tela quebrada",
      accessoriesLeft: "Capa preta",
      physicalState: "Arranhões nas bordas"
    });

    if (!osRes.ok) throw new Error(`Falha ao criar OS: ${JSON.stringify(osRes.data)}`);
    const osId = osRes.data.id;
    console.log("✅ OS Aberta:", osRes.data.osNumber, `(${osId})`);

    // 4. Testar bloqueio: Tentar mover para PRONTO sem laudo
    console.log("4️⃣ Testando trava do Kanban (Mover para PRONTO_RETIRADA sem laudo)...");
    const blockRes = await api(`/ordens-servico/${osId}/status`, "PUT", {
      status: "PRONTO_RETIRADA"
    });

    if (blockRes.status === 422) {
      console.log("✅ Bloqueio funcionou! Mensagem:", blockRes.data.error);
    } else {
      throw new Error(`Falha na trava. A OS não deveria avançar. Status retornado: ${blockRes.status}`);
    }

    // 5. Atualizar OS com laudo e custo
    console.log("5️⃣ Inserindo Laudo e Custos na OS...");
    const updateRes = await api(`/ordens-servico/${osId}`, "PUT", {
      diagnostic: "Substituição do display frontal realizada com sucesso.",
      laborCost: 150.00,
      technicianLaborHours: 1,
      technicianHourlyRate: 150.00,
      usedParts: [] // Simulação sem peças
    });

    if (!updateRes.ok) throw new Error(`Falha ao atualizar OS: ${JSON.stringify(updateRes.data)}`);
    console.log("✅ OS atualizada com laudo.");

    // 6. Mover para PRONTO (Deve passar agora)
    console.log("6️⃣ Movendo OS para PRONTO_RETIRADA...");
    const prontoRes = await api(`/ordens-servico/${osId}/status`, "PUT", {
      status: "PRONTO_RETIRADA"
    });

    if (!prontoRes.ok) throw new Error(`Falha ao mover para PRONTO: ${JSON.stringify(prontoRes.data)}`);
    console.log("✅ OS agora está Pronta para Retirada.");

    // 7. Mover para FINALIZADO (Teste de Integração Bling)
    console.log("7️⃣ Movendo OS para FINALIZADO (Disparo Fiscal)...");
    const finalRes = await api(`/ordens-servico/${osId}/status`, "PUT", {
      status: "FINALIZADO"
    });

    if (!finalRes.ok) throw new Error(`Falha ao finalizar OS: ${JSON.stringify(finalRes.data)}`);
    console.log("✅ OS Finalizada!");

    // 8. Checar Faturamento (Integração)
    console.log("8️⃣ Checando Fila Fiscal...");
    const checkRes = await api(`/ordens-servico/${osId}`);
    const finishedOS = checkRes.data;
    if (!finishedOS || !finishedOS.id) throw new Error("OS finalizada não encontrada na busca.");
    console.log(`✅ Status Fiscal: ${finishedOS.billingStatus || 'PENDENTE'}`);
    
    if (finishedOS.billingLogs && finishedOS.billingLogs.length > 0) {
      console.log("📋 Logs do Faturamento:");
      finishedOS.billingLogs.forEach((log: string) => console.log(`   - ${log}`));
    }

    console.log("\n🎉 TESTE DE HOMOLOGAÇÃO END-TO-END CONCLUÍDO COM SUCESSO! 🎉");
    
  } catch (error: any) {
    console.error("\n❌ ERRO DURANTE HOMOLOGAÇÃO:", error.message);
    process.exit(1);
  }
}

// Inicia os testes se o script for rodado diretamente
runTests();
