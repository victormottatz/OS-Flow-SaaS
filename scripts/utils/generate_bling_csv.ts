import fs from "fs/promises";
import path from "path";

const DB_FILE = path.join(process.cwd(), "database.json");
const OUTPUT_DIR = path.join(process.cwd(), "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "clientes_para_bling.csv");

async function run() {
  console.log("Iniciando geração de CSV para Bling V3...");
  
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const data = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(data);
    
    const activeClients = db.clients.filter((c: any) => !c.deletedAt);
    console.log(`Encontrados ${activeClients.length} clientes ativos.`);

    const rows = [];
    const headers = [
      "ID", "Codigo", "Nome", "Fantasia", "Endereco", "Numero", "Complemento", 
      "Bairro", "CEP", "Cidade", "Estado", "Contatos", "Fone", "Fax", 
      "Celular", "E-mail", "Web Site", "Tipo_pessoa", "CNPJ_CPF", "IE_RG", "IE_isento",
      "Situacao", "Observacoes", "Estado_civil", "Profissao", "Sexo", "Data_nascimento",
      "Naturalidade", "Nome_pai", "CPF_pai", "Nome_mãe", "CPF_mãe", "Segmento",
      "Vendedor", "Tipo_Contato", "Email_para_envio_NFe", "Limite_credito",
      "Cliente_desde", "Proxima_visita", "Condição_pagamento", "Regime_Tributario"
    ];
    rows.push(headers.join(";"));

    for (const client of activeClients) {
      const documentSanitized = (client.cpfCnpj || "").replace(/\D/g, "");
      const phoneSanitized = (client.phone || "").replace(/\D/g, "").substring(0, 11);
      const nameSanitized = (client.name || "").trim().replace(/\s{2,}/g, " ");
      const tipoPessoa = documentSanitized.length > 11 ? "Pessoa Jurídica" : "Pessoa Física";
      const email = client.email || "";

      let logradouro = client.address;
      let numero = "S/N";
      let bairro = "Centro";
      let cep = "01000000";
      let municipio = "Nao informado";
      let uf = "SP";

      try {
        const parts = client.address.split(" - ");
        if (parts.length >= 1) {
          const streetAndNum = parts[0].split(",");
          logradouro = streetAndNum[0].trim();
          if (streetAndNum.length > 1) {
            numero = streetAndNum[1].trim();
          }
        }
        if (parts.length >= 2) {
          bairro = parts[1].trim();
        }
        if (parts.length >= 3) {
          const cityAndUf = parts[2].split("/");
          municipio = cityAndUf[0].trim();
          if (cityAndUf.length > 1) {
            uf = cityAndUf[1].trim().toUpperCase().substring(0, 2);
          }
        }
      } catch (e) {
        // fallback
      }

      // Escape quotes and delimiters (replace semicolon with space to prevent splitting errors)
      const cleanField = (str: string) => `"${String(str).replace(/"/g, '""').replace(/;/g, ' ')}"`;

      const rowData = [
        "", // ID
        "", // Codigo
        cleanField(nameSanitized), // Nome
        cleanField(nameSanitized), // Fantasia
        cleanField(logradouro), // Endereco
        cleanField(numero), // Numero
        "", // Complemento
        cleanField(bairro), // Bairro
        cleanField(cep), // CEP
        cleanField(municipio), // Cidade
        cleanField(uf), // Estado
        "", // Contatos
        cleanField(phoneSanitized), // Fone
        "", // Fax
        cleanField(phoneSanitized), // Celular
        cleanField(email), // E-mail
        "", // Web Site
        cleanField(tipoPessoa), // Tipo_pessoa
        cleanField(documentSanitized), // CNPJ_CPF
        "", // IE_RG
        "", // IE_isento
        "Ativo", // Situacao
        "", // Observacoes
        "", // Estado_civil
        "", // Profissao
        "", // Sexo
        "", // Data_nascimento
        "", // Naturalidade
        "", // Nome_pai
        "", // CPF_pai
        "", // Nome_mãe
        "", // CPF_mãe
        "", // Segmento
        "", // Vendedor
        "Cliente", // Tipo_Contato
        "", // Email_para_envio_NFe
        "", // Limite_credito
        "", // Cliente_desde
        "", // Proxima_visita
        "", // Condição_pagamento
        "" // Regime_Tributario
      ];

      rows.push(rowData.join(";"));
    }

    await fs.writeFile(OUTPUT_FILE, rows.join("\n"), "utf-8");
    console.log(`\nCSV gerado com sucesso: ${OUTPUT_FILE}`);
    console.log(`Pronto para ser importado no painel web do Bling V3.`);
  } catch (err: any) {
    console.error("Erro ao gerar CSV:", err.message);
  }
}

run();
