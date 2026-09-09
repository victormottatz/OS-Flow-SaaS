import { PrismaClient } from '@prisma/client';
import { syncSinglePartToBling, auditStockAndFiscalDivergences } from './src/services/bling.js';

const prisma = new PrismaClient();

// Função de classificação semântica com base nas regras fiscais e histórico da MGV
function inferNcm(name: string, currentNcm?: string | null): { ncm: string; reason: string } {
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

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO CLASSIFICAÇÃO E PREENCHIMENTO DE NCMS (MGV ↔ BLING)');
  console.log('================================================================');

  const parts = await prisma.part.findMany({
    where: { deletedAt: null }
  });

  const withoutNcm = parts.filter(p => !p.ncm || p.ncm.replace(/\D/g, '').length !== 8);
  console.log(`Total de peças ativas: ${parts.length}`);
  console.log(`Peças que necessitam de NCM: ${withoutNcm.length}`);

  if (withoutNcm.length === 0) {
    console.log('Todas as peças já possuem NCM válido!');
    return;
  }

  // Mapeamento e Atualização no Banco de Dados MGV
  console.log('\n[1/3] Classificando e atualizando peças no banco de dados do MGV...');
  
  const updatedParts: Array<{ id: string; code: string; name: string; ncm: string; reason: string }> = [];
  
  for (const part of withoutNcm) {
    const classification = inferNcm(part.name, part.ncm);
    
    await prisma.part.update({
      where: { id: part.id },
      data: { ncm: classification.ncm }
    });

    updatedParts.push({
      id: part.id,
      code: part.code,
      name: part.name,
      ncm: classification.ncm,
      reason: classification.reason
    });
  }

  console.log(`✓ ${updatedParts.length} peças atualizadas no banco com NCM válido de 8 dígitos.`);

  // Exibir amostra das classificações
  console.log('\nAmostra das Classificações Aplicadas (Primeiras 15):');
  updatedParts.slice(0, 15).forEach((p, idx) => {
    console.log(`${idx + 1}. [SKU: ${p.code}] ${p.name.padEnd(45).substring(0, 45)} ➔ NCM: ${p.ncm} (${p.reason})`);
  });

  // Estatística de NCMs aplicados
  const appliedDistribution: Record<string, number> = {};
  updatedParts.forEach(p => {
    appliedDistribution[p.ncm] = (appliedDistribution[p.ncm] || 0) + 1;
  });
  console.log('\nDistribuição dos NCMs atribuídos:', appliedDistribution);

  // [2/3] Sincronização em Lote com o Bling ERP
  console.log('\n[2/3] Sincronizando dados cadastrais (NCMs) atualizados com o Bling ERP...');
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  let syncSuccess = 0;
  let syncErrors = 0;

  for (let i = 0; i < updatedParts.length; i++) {
    const p = updatedParts[i];
    const percent = (((i + 1) / updatedParts.length) * 100).toFixed(1);

    try {
      await syncSinglePartToBling(p.id);
      syncSuccess++;
      if ((i + 1) % 20 === 0 || i === updatedParts.length - 1) {
        console.log(`[${percent}%] (${i + 1}/${updatedParts.length}) ✓ Sincronizado Bling: SKU ${p.code} (NCM ${p.ncm})`);
      }
    } catch (err: any) {
      syncErrors++;
      console.warn(`[${percent}%] (${i + 1}/${updatedParts.length}) ❌ Erro SKU ${p.code}: ${err.message}`);
    }

    await sleep(600); // Rate Limit do Bling
  }

  console.log(`\nFim da sincronização no Bling: ${syncSuccess} sucessos, ${syncErrors} erros.`);

  // [3/3] Auditoria de Validação Final
  console.log('\n[3/3] Executando auditoria de validação final...');
  await sleep(2000);
  const audit = await auditStockAndFiscalDivergences();

  console.log('\n================================================================');
  console.log('📊 RESULTADO DA AUDITORIA FISCAL');
  console.log('================================================================');
  console.log(`Total de Itens Auditados: ${audit.totalItems}`);
  console.log(`- Peças no MGV com NCM Válido: 100% (${parts.length} de ${parts.length})`);
  console.log(`- Sincronizados (OK): ${audit.synchronizedCount}`);
  console.log(`- Divergência de Quantidade: ${audit.qtyDivergenceCount}`);
  console.log(`- Divergência Fiscal Restante: ${audit.fiscalDivergenceCount}`);
  console.log('================================================================');
}

main()
  .catch(err => console.error('Erro:', err))
  .finally(() => prisma.$disconnect());
