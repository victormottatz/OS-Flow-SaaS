import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { 
  fetchAllBlingProducts, 
  startStockSyncWorker, 
  getStockSyncWorkerStatus 
} from "./src/services/bling.js";

const prisma = new PrismaClient();

// Função de classificação semântica com base nas regras fiscais e histórico da MGV (inferNcm)
function inferNcm(name: string): { ncm: string; reason: string } {
  const upper = (name || '').toUpperCase();
  
  // 1. Extração direta de menção explícita de NCM no texto
  const explicitMatch = upper.match(/NCM\s*[:\.]?\s*(\d{8})/i);
  if (explicitMatch) {
    return { ncm: explicitMatch[1], reason: 'NCM extraído diretamente do texto da peça' };
  }

  // 2. Fontes, Transformadores e Carregadores
  if (upper.includes('FONTE') || upper.includes('TRANSFORMADOR') || upper.includes('TRAFO') || upper.includes('CARREGADOR')) {
    return { ncm: '85044021', reason: 'Fontes de alimentação chaveadas / transformadores' };
  }

  // 3. Cabos, Chicotes, Cordões, Plugs e Conectores
  if (upper.includes('CABO') || upper.includes('CHICOTE') || upper.includes('CORDAO') || upper.includes('CORDÃO') || upper.includes('PLUG') || upper.includes('CONECTOR') || upper.includes('JACK')) {
    return { ncm: '85444200', reason: 'Condutores elétricos munidos de peças de conexão' };
  }

  // 4. Adesivos, Painéis Frontais, Membranas, Películas e Teclados de Membrana
  if (upper.includes('ADESIVO') || upper.includes('PAINEL') || upper.includes('PAINEL FRONTAL') || upper.includes('MEMBRANA') || upper.includes('PELICULA') || upper.includes('PELÍCULA') || upper.includes('TECLADO')) {
    return { ncm: '39199090', reason: 'Placas, películas, tiras autoadesivas de plástico' };
  }

  // 5. Vidros, Copos, Tubos de Quartzo, Lâmpadas
  if (upper.includes('COPO') || upper.includes('VIDRO') || upper.includes('QUARTZO') || upper.includes('BULBO')) {
    return { ncm: '70179000', reason: 'Artigos de vidro para uso técnico / laboratório' };
  }

  // 6. Válvulas, Registros, Filtros e Bombas
  if (upper.includes('VALVULA') || upper.includes('VÁLVULA') || upper.includes('REGISTRO') || upper.includes('ENGATE')) {
    return { ncm: '84818099', reason: 'Dispositivos de canalização / torneiras / válvulas' };
  }
  if (upper.includes('FILTRO') || upper.includes('BLISTER')) {
    return { ncm: '84212990', reason: 'Aparelhos para filtrar ou depurar líquidos/gases' };
  }
  if (upper.includes('BOMBA') || upper.includes('MOTOR') || upper.includes('MICRO VENTILADOR') || upper.includes('COOLER') || upper.includes('VENTOINHA')) {
    return { ncm: '84145990', reason: 'Ventiladores / exaustores / motores de circulação' };
  }

  // 7. Borrachas, Anéis O-Ring, Gaxetas, Selos
  if (upper.includes('BORRACHA') || upper.includes('O-RING') || upper.includes('ORING') || upper.includes('ANEL') || upper.includes('GAXETA') || upper.includes('SELO')) {
    return { ncm: '40169300', reason: 'Juntas, gaxetas e semelhantes de borracha vulcanizada' };
  }

  // 8. Obras de Plástico, Gabinetes, Tampas, Caixas, Suportes Plásticos, Ventosas
  if (upper.includes('GABINETE') || upper.includes('TAMPA') || upper.includes('CAIXA') || upper.includes('SUPORTE') || upper.includes('BUCHA') || upper.includes('VENTOSA') || upper.includes('CARCACA') || upper.includes('CARCAÇA') || upper.includes('ROLETE') || upper.includes('MANOPLA')) {
    return { ncm: '39269090', reason: 'Outras obras de plástico' };
  }

  // 9. Componentes Eletrônicos / Circuitos Integrados / Chaves
  if (upper.includes('INTERRUPTOR') || upper.includes('CHAVE') || upper.includes('BOTAO') || upper.includes('BOTÃO') || upper.includes('FUSIVEL') || upper.includes('FUSÍVEL')) {
    return { ncm: '85365090', reason: 'Aparelhos para interrupção, seccionamento de circuitos' };
  }

  // 10. Aparelhos Eletromédicos, Estéticos, Eletrodos, Transdutores, Manípulos, Ponteiras e Placas de Controle Eletromédicas
  if (upper.includes('ELETRODO') || upper.includes('APLICADOR') || upper.includes('TRANSDUTOR') || upper.includes('MANIPULO') || upper.includes('MANÍPULO') || upper.includes('PONTEIRA') || upper.includes('SENSOR') || upper.includes('PLACA') || upper.includes('PCI') || upper.includes('LASER') || upper.includes('ULTRASSOM') || upper.includes('RADIOFREQUENCIA') || upper.includes('VACUO') || upper.includes('VÁCUO') || upper.includes('CRIODERMIS') || upper.includes('POLARYS') || upper.includes('NEURODYN') || upper.includes('SONOPULSE') || upper.includes('HECCUS') || upper.includes('DERMOTONUS')) {
    return { ncm: '90189099', reason: 'Instrumentos, aparelhos e partes para medicina / estética' };
  }

  // 11. Produtos Químicos / Soluções
  if (upper.includes('SOLUCAO') || upper.includes('SOLUÇÃO') || upper.includes('OLEO') || upper.includes('ÓLEO') || upper.includes('GRAXA') || upper.includes('ALCOOL') || upper.includes('ÁLCOOL')) {
    return { ncm: '34039900', reason: 'Preparações lubrificantes / anticorrosivas' };
  }

  // Padrão Geral da Assistência Técnica (Partes e acessórios de aparelhos eletromédicos)
  return { ncm: '90189099', reason: 'Partes e peças sobressalentes para equipamentos eletromédicos/estética' };
}

// Auxiliar para atrasar execução
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("================================================================");
  console.log("🚀 INICIANDO SANEAMENTO DE PREÇOS E NCMS NO BANCO DE DADOS MGV");
  console.log("================================================================");

  // 1. Obter catálogo local do MGV
  console.log("⏳ Carregando peças do banco de dados local...");
  const parts = await prisma.part.findMany({
    where: { deletedAt: null }
  });
  console.log(`✓ Encontradas ${parts.length} peças ativas no MGV.`);

  // 2. Obter catálogo de produtos do Bling
  console.log("⏳ Carregando catálogo de produtos do Bling ERP...");
  let blingProducts: any[] = [];
  try {
    blingProducts = await fetchAllBlingProducts();
    console.log(`✓ Encontrados ${blingProducts.length} produtos no Bling.`);
  } catch (err: any) {
    console.error("❌ Falha ao carregar catálogo do Bling:", err.message);
    console.log("Abortando saneamento por segurança (necessitamos do catálogo do Bling para cruzar dados).");
    return;
  }

  // 3. Indexar produtos do Bling por SKU (código) e por Nome para busca rápida
  const blingByCode = new Map<string, any>();
  const blingByName = new Map<string, any>();

  for (const bp of blingProducts) {
    const code = (bp.codigo || "").trim().toUpperCase();
    const name = (bp.nome || "").trim().toUpperCase();
    if (code) blingByCode.set(code, bp);
    if (name) blingByName.set(name, bp);
  }

  // 4. Executar varredura e saneamento
  console.log("\n⏳ Iniciando processamento e saneamento das peças...");
  let priceFixedCount = 0;
  let ncmFixedCount = 0;
  let bothFixedCount = 0;
  let unchangedCount = 0;

  for (const part of parts) {
    const codeClean = (part.code || "").trim().toUpperCase();
    const nameClean = (part.name || "").trim().toUpperCase();

    // Tenta encontrar correspondente no Bling
    const matchedBling = (codeClean && blingByCode.get(codeClean)) || blingByName.get(nameClean);

    let priceUpdated = false;
    let ncmUpdated = false;
    let newPrice = part.price;
    let newNcm = part.ncm;

    // A: Saneamento de Preço (Se for <= R$ 0.01)
    if (part.price <= 0.01) {
      const blingPrice = matchedBling ? Number(matchedBling.preco || 0) : 0;
      if (blingPrice > 0.01) {
        // 1. Usar o preço do Bling
        newPrice = blingPrice;
        priceUpdated = true;
      } else if (part.cost > 0.01) {
        // 2. Usar Custo + 50%
        newPrice = parseFloat((part.cost * 1.5).toFixed(2));
        priceUpdated = true;
      } else {
        // 3. Fallback absoluto de R$ 1,00 (conforme definido pelo usuário)
        newPrice = 1.0;
        priceUpdated = true;
      }
    }

    // B: Saneamento de NCM (Se nulo, vazio ou diferente de 8 dígitos numéricos)
    const cleanLocalNcm = (part.ncm || "").replace(/\D/g, "");
    if (cleanLocalNcm.length !== 8) {
      const blingNcm = matchedBling ? (matchedBling.ncm || matchedBling.tributacao?.ncm || "").replace(/\D/g, "") : "";
      if (blingNcm.length === 8) {
        // 1. Usar NCM do Bling
        newNcm = blingNcm;
        ncmUpdated = true;
      } else {
        // 2. Inferência semântica baseada no nome
        const inferred = inferNcm(part.name);
        newNcm = inferred.ncm;
        ncmUpdated = true;
      }
    }

    // Persistir se houve mudança
    if (priceUpdated || ncmUpdated) {
      await prisma.part.update({
        where: { id: part.id },
        data: {
          price: newPrice,
          ncm: newNcm
        }
      });

      if (priceUpdated && ncmUpdated) {
        bothFixedCount++;
      } else if (priceUpdated) {
        priceFixedCount++;
      } else {
        ncmFixedCount++;
      }

      console.log(`✏️ SKU ${part.code || "S/C"} [${part.name.substring(0, 30)}]: ` + 
        (priceUpdated ? `Preço ${part.price.toFixed(2)} ➔ ${newPrice.toFixed(2)} | ` : "") +
        (ncmUpdated ? `NCM ${(part.ncm || "vazio")} ➔ ${newNcm}` : "")
      );
    } else {
      unchangedCount++;
    }
  }

  console.log("\n================================================================");
  console.log("📊 RESUMO DO SANEAMENTO");
  console.log("================================================================");
  console.log(`- Peças inalteradas (já corretas): ${unchangedCount}`);
  console.log(`- Peças apenas com preço corrigido: ${priceFixedCount}`);
  console.log(`- Peças apenas com NCM corrigido: ${ncmFixedCount}`);
  console.log(`- Peças com preço E NCM corrigidos: ${bothFixedCount}`);
  console.log(`- Total de peças saneadas no banco: ${priceFixedCount + ncmFixedCount + bothFixedCount}`);
  console.log("================================================================\n");

  // 5. Disparar a sincronização em lote
  console.log("🚀 Acionando a sincronização de catálogo e estoque...");
  const serverPort = process.env.PORT || "3001";
  const syncUrl = `http://localhost:${serverPort}/bling/sync/catalog`;

  try {
    console.log(`⏳ Enviando requisição POST para o servidor backend local (${syncUrl})...`);
    const response = await axios.post(syncUrl);
    console.log(`✓ Sincronização iniciada com sucesso via servidor backend local!`);
    console.log(`Resposta: ${JSON.stringify(response.data?.message || response.data)}`);
    console.log("O progresso pode ser acompanhado no painel administrativo do MGV ou nos logs do servidor.");
  } catch (err: any) {
    if (err.code === "ECONNREFUSED") {
      console.log(`⚠️ Servidor backend local offline na porta ${serverPort}.`);
      console.log("💡 Iniciando sincronização local diretamente por este script no terminal...");
      
      // Aciona o Worker diretamente
      const syncResult = await startStockSyncWorker({ divergentOnly: true });
      console.log(`✓ ${syncResult.message}`);
      
      console.log("\n⏳ Aguardando e monitorando o progresso da sincronização local...");
      let completed = false;
      const progressWidth = 30;

      while (!completed) {
        await sleep(1500);
        const status = getStockSyncWorkerStatus();
        
        const cleanPct = Math.max(0, Math.min(100, status.percentage));
        const filled = Math.round((cleanPct / 100) * progressWidth);
        const empty = progressWidth - filled;
        const progressBar = "█".repeat(filled) + "░".repeat(empty);

        process.stdout.write(`\r[${progressBar}] ${cleanPct}% (${status.processed}/${status.total}) | Processando: ${status.currentItem || "Aguardando..."}     `);

        if (status.status === "completed" || status.status === "stopped" || status.status === "error") {
          completed = true;
          console.log(`\n\n🎉 Sincronização concluída!`);
          console.log(`- Sucessos: ${status.successCount}`);
          console.log(`- Erros/Falhas: ${status.errorCount}`);
          if (status.lastError) {
            console.log(`❌ Último erro relatado: ${status.lastError}`);
          }
        }
      }
    } else {
      console.error(`❌ Erro inesperado ao acionar o faturamento/sincronização do Bling: ${err.message}`);
    }
  }
}

main()
  .catch(err => {
    console.error("❌ Erro fatal durante a execução do saneamento:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
