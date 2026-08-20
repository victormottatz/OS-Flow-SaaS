import { syncClientToBling } from './src/services/bling';

async function test() {
  try {
    const id = await syncClientToBling({
      name: "Teste Cliente API 4",
      cpfCnpj: "12345678901",
      phone: "11999999999",
      email: "teste4@teste.com",
      address: "Rua Teste, 123",
    });
    console.log("Criado no Bling ID:", id);
  } catch (err: any) {
    console.error("Erro:", err.message);
  }
}
test();
