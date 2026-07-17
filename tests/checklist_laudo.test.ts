import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:3000/api";
const JWT_SECRET = process.env.JWT_SECRET || "mgv_tecnologia_super_secure_jwt_secret_key_123!";
const TEST_TOKEN = jwt.sign({ id: "test-admin", role: "OWNER" }, JWT_SECRET, { expiresIn: "1h" });

// Helper para chamadas de API
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

// Imagem base64 fictícia (pequena, 1x1 pixel vermelha em png)
const base64RedDot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

async function runChecklistTests() {
  console.log("🚀 Iniciando Testes do Módulo de Checklist e Laudo Fotográfico...");

  try {
    // 1. Criar Cliente de Teste
    console.log("1️⃣ Criando Cliente...");
    const cpfUnico = Math.floor(Math.random() * 90000000000) + 10000000000;
    const clientRes = await api("/clients", "POST", {
      name: "Cliente Teste Checklist",
      cpfCnpj: String(cpfUnico),
      phone: "11999998888",
      email: "checklist@teste.com",
      address: "Rua das Flores, 456"
    });
    if (!clientRes.ok) throw new Error(`Erro ao criar cliente: ${JSON.stringify(clientRes.data)}`);
    const clientId = clientRes.data.client.id;
    console.log("✅ Cliente criado:", clientId);

    // 2. Criar Aparelho de Teste
    console.log("2️⃣ Criando Aparelho...");
    const deviceRes = await api("/devices", "POST", {
      clientId,
      type: "Autoclave",
      brand: "Cristofoli",
      model: "Vitale 12",
      serialNumber: "AUTO-889977"
    });
    if (!deviceRes.ok) throw new Error(`Erro ao criar aparelho: ${JSON.stringify(deviceRes.data)}`);
    const deviceId = deviceRes.data.id;
    console.log("✅ Aparelho criado:", deviceId);

    // 3. Criar Ordem de Serviço
    console.log("3️⃣ Criando Ordem de Serviço...");
    const osRes = await api("/ordens-servico", "POST", {
      clientId,
      deviceId,
      reportedDefect: "Não está aquecendo"
    });
    if (!osRes.ok) throw new Error(`Erro ao criar OS: ${JSON.stringify(osRes.data)}`);
    const osId = osRes.data.id;
    console.log("✅ OS criada:", osRes.data.osNumber, `(${osId})`);

    // 4. Testar gravação do Checklist de Saída
    console.log("4️⃣ Gravando Checklist de Saída...");
    const checklistSaidaMock = [
      { id: "geral", label: "Funcionamento Geral do Equipamento", status: "OK", observacao: "" },
      { id: "limpeza", label: "Limpeza Física Externa", status: "OK", observacao: "" },
      { id: "seguranca", label: "Lacre de Segurança Aplicado", status: "AVARIA", observacao: "Selo levemente descolado" }
    ];
    const saidaRes = await api(`/ordens-servico/${osId}/checklist-saida`, "POST", {
      checklistSaida: checklistSaidaMock
    });
    if (!saidaRes.ok) throw new Error(`Erro ao gravar checklist de saída: ${JSON.stringify(saidaRes.data)}`);
    console.log("✅ Checklist de saída gravado com sucesso.");
    if (saidaRes.data.checklistSaida.length !== 3) {
      throw new Error("Tamanho do checklist de saída salvo diverge do mockado.");
    }
    console.log("✅ Validação de checklist de saída gravado confirmada.");

    // 5. Testar limite de 6 fotos de entrada
    console.log("5️⃣ Testando limite de upload (tentando enviar 7 fotos)...");
    const sevenPhotos = Array.from({ length: 7 }, (_, i) => ({
      id: `foto-${i}`,
      dataUrl: base64RedDot,
      legenda: `Foto ${i}`,
      capturedAt: new Date().toISOString()
    }));
    const limitRes = await api(`/ordens-servico/${osId}/laudo-fotos`, "PUT", {
      checklistEntrada: [],
      laudoFotos: sevenPhotos
    });
    if (limitRes.status === 400) {
      console.log("✅ Bloqueio de limite de fotos no backend funcionando! Mensagem:", limitRes.data.error);
    } else {
      throw new Error(`O backend deveria bloquear mais de 6 fotos com status 400, mas retornou: ${limitRes.status}`);
    }

    // 6. Testar envio de até 6 fotos e verificar o processamento
    console.log("6️⃣ Testando envio válido (3 fotos) e redimensionamento...");
    const validPhotos = Array.from({ length: 3 }, (_, i) => ({
      id: `foto-${i}`,
      dataUrl: base64RedDot,
      legenda: `Foto Válida ${i}`,
      capturedAt: new Date().toISOString()
    }));
    const photosRes = await api(`/ordens-servico/${osId}/laudo-fotos`, "PUT", {
      checklistEntrada: [],
      laudoFotos: validPhotos
    });
    if (!photosRes.ok) throw new Error(`Erro ao gravar fotos válidas: ${JSON.stringify(photosRes.data)}`);
    console.log("✅ Gravação de fotos válidas retornou status OK.");
    if (photosRes.data.laudoFotos.length !== 3) {
      throw new Error("Tamanho das fotos salvas difere do enviado.");
    }
    // O Sharp deve ter processado a imagem para jpeg
    const firstPhoto = photosRes.data.laudoFotos[0];
    if (!firstPhoto.dataUrl.startsWith("data:image/jpeg;base64,")) {
      throw new Error(`A imagem deveria ter sido convertida para JPEG pelo Sharp, mas dataUrl é: ${firstPhoto.dataUrl.substring(0, 40)}`);
    }
    console.log("✅ Fotos processadas e convertidas com sucesso para JPEG pelo sharp!");

    console.log("\n🎉 TODOS OS TESTES DO MÓDULO DE CHECKLIST E FOTOS PASSARAM! 🎉");

  } catch (error: any) {
    console.error("\n❌ FALHA NOS TESTES:", error.message);
    process.exit(1);
  }
}

runChecklistTests();
