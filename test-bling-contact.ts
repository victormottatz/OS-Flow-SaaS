/**
 * Teste de validação do campo `tipo` na API Bling v3
 * Executa: npx tsx test-bling-contact.ts
 */

import axios from "axios";
import prisma from "./src/database/prisma";

const BLING_API = "https://api.bling.com.br/Api/v3";

async function testContactCreation() {
  console.log("=== Teste de Contato Bling v3 ===\n");

  // 1. Buscar token
  const config = await prisma.blingConfig.findFirst();
  if (!config) {
    console.error("❌ Nenhum token Bling encontrado no banco de dados.");
    console.error("   Execute o OAuth primeiro via /api/integration/bling/connect");
    process.exit(1);
  }

  const token = config.accessToken;
  console.log(`✓ Token encontrado (expira em: ${config.expiresAt.toISOString()})`);

  // 2. Testar criação de contato PF com novo formato
  console.log("\n--- Teste 1: Criar contato PF (tipo: 'F') ---");
  const pfPayload = {
    nome: "Cliente Teste PF - DELETE ME",
    tipo: "F",
    situacao: "A",
    cpfCnpj: "12345678901",
    endereco: {
      logradouro: "Rua Teste",
      numero: "123",
      bairro: "Centro",
      cep: "14010-000",
      cidade: "Ribeirão Preto",
      uf: "SP"
    }
  };

  try {
    const pfRes = await axios.post(`${BLING_API}/contatos`, pfPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`✅ Contato PF criado com sucesso! ID: ${pfRes.data?.data?.id}`);
    
    // Deletar o contato de teste
    const pfId = pfRes.data?.data?.id;
    if (pfId) {
      await axios.delete(`${BLING_API}/contatos/${pfId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`   → Contato de teste PF removido (ID: ${pfId})`);
    }
  } catch (err: any) {
    const errorData = err.response?.data;
    console.error(`❌ Falha ao criar contato PF:`);
    console.error(`   Status: ${err.response?.status}`);
    console.error(`   Erro: ${JSON.stringify(errorData, null, 2)}`);
  }

  // 3. Testar criação de contato PJ com novo formato
  console.log("\n--- Teste 2: Criar contato PJ (tipo: 'J') ---");
  const pjPayload = {
    nome: "Empresa Teste PJ - DELETE ME",
    tipo: "J",
    situacao: "A",
    cnpj: "12345678000195",
    endereco: {
      logradouro: "Av Teste",
      numero: "456",
      bairro: "Industrial",
      cep: "14010-000",
      cidade: "Ribeirão Preto",
      uf: "SP"
    }
  };

  try {
    const pjRes = await axios.post(`${BLING_API}/contatos`, pjPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`✅ Contato PJ criado com sucesso! ID: ${pjRes.data?.data?.id}`);
    
    // Deletar o contato de teste
    const pjId = pjRes.data?.data?.id;
    if (pjId) {
      await axios.delete(`${BLING_API}/contatos/${pjId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`   → Contato de teste PJ removido (ID: ${pjId})`);
    }
  } catch (err: any) {
    const errorData = err.response?.data;
    console.error(`❌ Falha ao criar contato PJ:`);
    console.error(`   Status: ${err.response?.status}`);
    console.error(`   Erro: ${JSON.stringify(errorData, null, 2)}`);
  }

  // 4. Testar busca de contatos existentes (para validar token)
  console.log("\n--- Teste 3: Buscar contatos existentes ---");
  try {
    const searchRes = await axios.get(`${BLING_API}/contatos`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { nome: "MARILIA", limite: 5 }
    });
    const contatos = searchRes.data?.data || [];
    console.log(`✅ Busca realizada. Encontrados ${contatos.length} contatos.`);
    if (contatos.length > 0) {
      console.log("   Primeiros resultados:");
      contatos.slice(0, 3).forEach((c: any) => {
        console.log(`   - ${c.nome} (ID: ${c.id}, Tipo: ${c.tipo})`);
      });
    }
  } catch (err: any) {
    console.error(`❌ Falha na busca de contatos:`);
    console.error(`   Status: ${err.response?.status}`);
    console.error(`   Erro: ${JSON.stringify(err.response?.data, null, 2)}`);
  }

  console.log("\n=== Teste concluído ===");
}

testContactCreation()
  .catch((err) => {
    console.error("Erro fatal:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
