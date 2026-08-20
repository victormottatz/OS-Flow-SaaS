/**
 * Teste: Criar contato PJ usando cpfCnpj (nome canônico do schema)
 * Verifica que o campo cpfCnpj funciona para PJ (não apenas "cnpj")
 */
import axios from "axios";
import prisma from "./src/database/prisma";

const BLING_API = "https://api.bling.com.br/Api/v3";

async function testPjWithCpfCnpj() {
  console.log("=== Teste PJ com cpfCnpj (canônico) ===\n");

  const config = await prisma.blingConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    console.error("❌ Nenhum token Bling encontrado.");
    process.exit(1);
  }

  const token = config.accessToken;

  // Teste PJ com cpfCnpj (nome canônico do schema)
  console.log("--- Criar PJ com cpfCnpj ---");
  const pjPayload = {
    nome: "Empresa Teste CNPJ - DELETE ME",
    tipo: "J",
    situacao: "A",
    cpfCnpj: "12345678000195",   // ← nome canônico, não "cnpj"
    telefone: "16999999999",
    email: "teste@empresa.com",
    regimeTributario: 4,          // MEI
    inscricaoEstadual: "ISENTO",
    endereco: {
      logradouro: "Av Brasil",
      numero: "1000",
      bairro: "Centro",
      cep: "14010-000",
      cidade: "Ribeirão Preto",
      uf: "SP",
      pais: "Brasil"
    }
  };

  try {
    const res = await axios.post(`${BLING_API}/contatos`, pjPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    const id = res.data?.data?.id;
    console.log(`✅ Contato PJ criado com cpfCnpj! ID: ${id}`);

    // Verificar os dados salvos
    const verify = await axios.get(`${BLING_API}/contatos/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contato = verify.data?.data;
    console.log(`   Tipo: ${contato.tipoPessoa || contato.tipo}`);
    console.log(`   CPF/CNPJ: ${contato.cpfCnpj || contato.cnpj}`);
    console.log(`   Situação: ${contato.situacao}`);
    console.log(`   Regime: ${contato.regimeTributario}`);

    // Deletar contato de teste
    await axios.delete(`${BLING_API}/contatos/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`   → Contato de teste PJ removido (ID: ${id})`);
  } catch (err: any) {
    const errorData = err.response?.data;
    console.error(`❌ Falha ao criar contato PJ com cpfCnpj:`);
    console.error(`   Status: ${err.response?.status}`);
    console.error(`   Erro: ${JSON.stringify(errorData, null, 2)}`);
  }
}

testPjWithCpfCnpj();
