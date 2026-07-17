import { PrismaClient, OSStatus } from "@prisma/client";
import xlsx from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

// Funções de sanitização e parser
function parseLegacyDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  
  const str = String(val).trim();
  if (str === "" || str === "0") return null;
  
  // Tentar parse manual de formato DD/MM/YYYY HH:mm:ss ou DD/MM/YYYY
  const matches = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (matches) {
    const [_, day, month, year, hour = "00", minute = "00", second = "00"] = matches;
    const dt = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return isNaN(dt.getTime()) ? null : dt;
  }
  
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseCurrency(val: any): number {
  if (val === null || val === undefined || val === "") return 0.0;
  if (typeof val === "number") return val;
  
  const clean = String(val).replace(/\s/g, "").replace(",", ".").replace(/[^0-9.-]+/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0.0 : num;
}

function sanitizePhone(val: any): string {
  if (!val) return "";
  const cleaned = String(val).replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return String(val).trim();
}

// Mapeador do enum OSStatus com base no texto da coluna Situação
function determineOSStatus(situacaoText: string): OSStatus {
  const clean = situacaoText.trim().toUpperCase();
  
  switch (clean) {
    case "AGUARDANDO AVALIAÇÃO":
    case "GARANTIA AGUAR. AVALIAÇÃO":
    case "":
      return OSStatus.AGUARDANDO_AVALIACAO;

    case "AGUARDANDO AUTORIZAÇÃO DE ORÇAMENTO":
      return OSStatus.AGUARDANDO_AUTORIZACAO;
      
    case "AGUARDANDO PEÇA":
      return OSStatus.AGUARDANDO_PECA;
      
    case "AUTORIZADO - REPARO EM ANDAMENTO":
    case "GARANTIA (AVALIADO)":
    case "FABRICA":
    case "MENSAGEM ENVIADA":
      return OSStatus.EM_MANUTENCAO;
      
    case "GARANTIA - PRONTO":
    case "PRONTO/CLIENTE AVISADO - FALTA PGTO":
      return OSStatus.PRONTO_RETIRADA;
      
    case "PAGO - CLIENTE AVISADO":
      return OSStatus.PAGO_PRONTO_RETIRADA;
      
    case "EQUIPAMENTO ENTREGUE REPARADO":
    case "EQUIPAMENTO DEVOLVIDO SEM REPARO":
    case "DESISTIU/SEM CONSERTO/SEM DEFEITO":
    case "EQUIPAMENTO ENTREGUE - FALTA PGTO":
    case "APARELHO DESCARTADO":
      return OSStatus.FINALIZADO;
      
    default:
      // Fallback amigável caso apareça alguma situação nova
      return OSStatus.EM_MANUTENCAO;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  
  const filePath = path.join(process.cwd(), "temp_migration", "ordens de serviço 17.07 11_25.xls");
  
  console.log(`\n========================================================`);
  console.log(`  MIGRAÇÃO DE ORDENS DE SERVIÇO LEGADAS (PLANILHA XLS)`);
  console.log(`========================================================`);
  console.log(`Arquivo origem: ${filePath}`);
  console.log(`Modo: ${isDryRun ? "DRY RUN (Simulação - nenhuma gravação no banco)" : "EXECUÇÃO REAL (Escrita/Upsert no Banco)"}`);
  console.log(`--------------------------------------------------------`);

  console.log("[1/4] Carregando e processando planilha Excel...");
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Ler como matriz de células (header: 1) para capturar o cabeçalho no índice correto
  const rawData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (rawData.length < 3) {
    throw new Error("A planilha está vazia ou não possui estrutura de dados suficiente.");
  }
  
  // Cabeçalhos reais estão na linha de índice 1
  const headers = rawData[1];
  const rows = rawData.slice(2);
  
  // Mapear índices de colunas
  const osNumIdx = headers.indexOf("OS Nº");
  const clienteIdx = headers.indexOf("Cliente");
  const telefoneIdx = headers.indexOf("Telefone");
  const enderecoIdx = headers.indexOf("Endereço");
  const cidadeUfIdx = headers.indexOf("Cidade/UF");
  const entradaIdx = headers.indexOf("Entrada");
  const prontoIdx = headers.indexOf("Pronto");
  const saidaIdx = headers.indexOf("Saída");
  const situacaoIdx = headers.indexOf("Situação");
  const totalIdx = headers.indexOf("Total");
  const equipamentoIdx = headers.indexOf("Equipamento");
  const defeitoIdx = headers.indexOf("Defeito");
  const marcaIdx = headers.indexOf("Marca");
  const modeloIdx = headers.indexOf("Modelo");
  const serieIdx = headers.indexOf("Nº de Série");
  const patrimonioIdx = headers.indexOf("Nº Patrimônio");
  const garantiaIdx = headers.indexOf("Garantia");
  const tecnicoIdx = headers.indexOf("Técnico Resp.");
  const vlrServIdx = headers.indexOf("Vlr Serv.");
  const vlrPecasIdx = headers.indexOf("Vlr Peças");
  const deslocamentoIdx = headers.indexOf("Deslocamento");
  const servTerceirosIdx = headers.indexOf("Serviço terceiros");
  const outrosIdx = headers.indexOf("OUTROS");

  // Validar se as colunas essenciais estão presentes
  if (osNumIdx === -1 || clienteIdx === -1 || situacaoIdx === -1) {
    throw new Error("Colunas críticas ausentes na planilha (OS Nº, Cliente ou Situação). Verifique a estrutura.");
  }

  console.log(`[2/4] Mapeamento de colunas inicializado. Linhas encontradas: ${rows.length}`);
  
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let skipEmpty = 0;

  const statusCounts: Record<string, number> = {
    AGUARDANDO_AVALIACAO: 0,
    AGUARDANDO_AUTORIZACAO: 0,
    AGUARDANDO_PECA: 0,
    EM_MANUTENCAO: 0,
    PRONTO_RETIRADA: 0,
    PAGO_PRONTO_RETIRADA: 0,
    FINALIZADO: 0
  };

  console.log("[3/4] Iniciando processamento linha a linha...");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) {
      skipEmpty++;
      continue;
    }

    const osNumber = String(row[osNumIdx] || "").trim();
    // Se não houver número de OS, pular
    if (!osNumber) {
      skipEmpty++;
      continue;
    }

    const clientName = String(row[clienteIdx] || "").trim();
    if (!clientName) {
      console.warn(`[Linha ${i + 3}] Aviso: OS ${osNumber} sem nome de cliente. Pulando.`);
      totalErrors++;
      continue;
    }

    // Extrair dados da linha
    const phone = sanitizePhone(row[telefoneIdx]);
    const address = String(row[enderecoIdx] || "").trim();
    const cityUf = String(row[cidadeUfIdx] || "").trim();
    const originalEntryDate = parseLegacyDate(row[entradaIdx]);
    const stressTestStartedAt = parseLegacyDate(row[prontoIdx]);
    const originalExitDate = parseLegacyDate(row[saidaIdx]);
    const rawSituacao = String(row[situacaoIdx] || "");
    const status = determineOSStatus(rawSituacao);
    
    // Custos
    const laborCost = parseCurrency(row[vlrServIdx]);
    const totalCost = parseCurrency(row[totalIdx]);
    const partsCost = parseCurrency(row[vlrPecasIdx]);
    const travelCost = parseCurrency(row[deslocamentoIdx]);
    const thirdPartyCost = parseCurrency(row[servTerceirosIdx]);
    const otherCost = parseCurrency(row[outrosIdx]);

    // Dados do equipamento
    const eqType = String(row[equipamentoIdx] || "Geral").trim() || "Geral";
    const eqBrand = String(row[marcaIdx] || "Não especificado").trim() || "Não especificado";
    const eqModel = String(row[modeloIdx] || "Não especificado").trim() || "Não especificado";
    const serialNumber = String(row[serieIdx] || "Sem Série").trim() || "Sem Série";
    const patrimonio = String(row[patrimonioIdx] || "").trim();
    
    const reportedDefect = String(row[defeitoIdx] || "Não informado").trim() || "Não informado";
    const warranty = String(row[garantiaIdx] || "").trim();
    const technician = String(row[tecnicoIdx] || "").trim();

    statusCounts[status]++;

    if (isDryRun) {
      // No modo Dry Run, apenas logamos as estatísticas
      totalProcessed++;
      continue;
    }

    try {
      // 1. Resolver Cliente (por nome exato)
      let client = await prisma.client.findFirst({
        where: { name: clientName }
      });

      if (!client) {
        // Criar cliente básico se não existir
        client = await prisma.client.create({
          data: {
            name: clientName,
            phone: phone || "Não informado",
            address: address ? `${address}${cityUf ? ", " + cityUf : ""}` : (cityUf || "Não informado"),
            cpfCnpj: "", // Sem documento nesta planilha
            email: "sem-email@mgv.com",
            legacyId: `LEG-${clientName.replace(/[^A-Z0-9]/gi, "").substring(0, 10).toUpperCase()}-${Date.now().toString().substring(8)}`
          }
        });
      }

      // 2. Resolver Equipamento (Base Instalada)
      // Buscamos um equipamento deste cliente com mesmo serial (se serial existir)
      let device = null;
      if (serialNumber !== "Sem Série") {
        device = await prisma.device.findFirst({
          where: {
            clientId: client.id,
            serialNumber: serialNumber
          }
        });
      }

      if (!device) {
        // Tenta achar por marca/modelo/tipo para evitar duplicar aparelhos genéricos do mesmo cliente
        device = await prisma.device.findFirst({
          where: {
            clientId: client.id,
            type: eqType,
            brand: eqBrand,
            model: eqModel
          }
        });
      }

      if (!device) {
        // Criar equipamento na base instalada do cliente
        device = await prisma.device.create({
          data: {
            clientId: client.id,
            type: eqType,
            brand: eqBrand,
            model: eqModel,
            serialNumber: serialNumber,
            description: patrimonio ? `Patrimônio: ${patrimonio}` : "Sem observações.",
            legacyId: `DEV-${osNumber}` // Id de referência legado ligado à OS original
          }
        });
      }

      // 3. Upsert da Ordem de Serviço (Idempotente com base no osNumber)
      const existingOS = await prisma.ordemServico.findUnique({
        where: { osNumber }
      });

      // Mapeamento das peças usadas em formato JSON compatível
      const usedPartsJson = partsCost > 0 
        ? JSON.stringify([{ partId: "legacy-part", name: "Peças Integradas (Legado)", quantity: 1, price: partsCost }])
        : "[]";

      // Adicionar observações extras como notas se houver dados de garantia ou técnico
      const diagnosticInfo = [
        technician ? `Técnico Responsável: ${technician}` : "",
        warranty ? `Status de Garantia: ${warranty}` : "",
        patrimonio ? `Patrimônio Equipamento: ${patrimonio}` : ""
      ].filter(Boolean).join(" | ") || null;

      if (existingOS) {
        // Se a OS já existe, atualizamos
        await prisma.ordemServico.update({
          where: { osNumber },
          data: {
            clientId: client.id,
            deviceId: device.id,
            status, // Prioridade absoluta da coluna Situação
            laborCost,
            totalCost,
            originalEntryDate,
            originalExitDate,
            stressTestStartedAt,
            reportedDefect,
            diagnostic: diagnosticInfo,
            usedParts: usedPartsJson
          }
        });
        totalUpdated++;
      } else {
        // Se não existe, criamos
        await prisma.ordemServico.create({
          data: {
            osNumber,
            clientId: client.id,
            deviceId: device.id,
            status,
            laborCost,
            totalCost,
            originalEntryDate,
            originalExitDate,
            stressTestStartedAt,
            reportedDefect,
            diagnostic: diagnosticInfo,
            usedParts: usedPartsJson,
            accessoriesLeft: "Nenhum",
            physicalState: "Não especificado"
          }
        });
        totalCreated++;
      }

      totalProcessed++;
    } catch (err) {
      console.error(`[Erro na Linha ${i + 3}] Falha ao processar OS ${osNumber}:`, err);
      totalErrors++;
    }
  }

  console.log("\n[4/4] Processamento concluído.");
  console.log(`\n--------------------------------------------------------`);
  console.log(`                 RELATÓRIO DE IMPORTAÇÃO`);
  console.log(`--------------------------------------------------------`);
  console.log(`Linhas de dados válidas lidas: ${totalProcessed + totalErrors}`);
  console.log(`Linhas vazias/ignoradas:        ${skipEmpty}`);
  console.log(`Registros criados:             ${totalCreated}`);
  console.log(`Registros atualizados:         ${totalUpdated}`);
  console.log(`Falhas de gravação/erros:      ${totalErrors}`);
  console.log(`--------------------------------------------------------`);
  console.log(`Distribuição de Status (Enums):`);
  console.log(`- AGUARDANDO_AVALIACAO:    ${statusCounts.AGUARDANDO_AVALIACAO}`);
  console.log(`- AGUARDANDO_AUTORIZACAO:  ${statusCounts.AGUARDANDO_AUTORIZACAO}`);
  console.log(`- AGUARDANDO_PECA:         ${statusCounts.AGUARDANDO_PECA}`);
  console.log(`- EM_MANUTENCAO:           ${statusCounts.EM_MANUTENCAO}`);
  console.log(`- PRONTO_RETIRADA:         ${statusCounts.PRONTO_RETIRADA}`);
  console.log(`- PAGO_PRONTO_RETIRADA:    ${statusCounts.PAGO_PRONTO_RETIRADA}`);
  console.log(`- FINALIZADO:              ${statusCounts.FINALIZADO}`);
  console.log(`========================================================\n`);
}

main()
  .catch(err => {
    console.error("Erro crítico na migração:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
