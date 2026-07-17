import prisma from '../../src/database/prisma';
import { MigrationRulesEngine } from '../../src/domain/os/MigrationRulesEngine';
import { CaixaEntry, BrunoPayment, PhysicalReadyOS } from '../../src/services/OSConciliatorService';

async function testRulesEngine() {
  console.log('======================================================');
  console.log('      SMOKE TEST: MOTOR DE REGRAS DE CONCILIAÇÃO     ');
  console.log('======================================================');

  try {
    // 1. Fetch one active OS to simulate on
    const activeOS = await prisma.ordemServico.findFirst({
      where: {
        deletedAt: null,
        status: {
          notIn: ['FINALIZADO', 'PAGO_PRONTO_RETIRADA']
        }
      },
      include: {
        client: true,
        device: true
      }
    });

    if (!activeOS) {
      console.log('[Info] Nenhuma O.S. ativa encontrada no banco para rodar o teste.');
      console.log('TEST SKIPPED (Sem dados ativos no banco).');
      return;
    }

    console.log(`O.S. Selecionada para Teste: #${activeOS.osNumber}`);
    console.log(`Cliente: ${activeOS.client?.name || 'Sem nome'}`);
    console.log(`Valor do Banco: R$ ${activeOS.totalCost.toFixed(2)}`);

    const osNumberClean = activeOS.osNumber.replace('OS-', '').trim();

    // 2. Mock Caixa Entry for this OS
    const mockCaixa: CaixaEntry[] = [{
      filePath: 'mock_caixa.pdf',
      fileName: 'mock_caixa.pdf',
      date: '15/07/2026',
      cliente: activeOS.client?.name || 'CLIENTE TESTE',
      os: osNumberClean,
      equipamento: activeOS.device?.model || 'EQUIPAMENTO TESTE',
      formaPag: 'PIX (BRUNO)',
      valor: activeOS.totalCost
    }];

    // 3. Mock Bruno Payment for this OS
    const mockPayment: BrunoPayment[] = [{
      filePath: 'mock_bruno.xlsx',
      fileName: 'mock_bruno.xlsx',
      refMonth: '07/2026',
      cliente: activeOS.client?.name || 'CLIENTE TESTE',
      valor: activeOS.totalCost
    }];

    // Mock Physical ready list entry
    const mockPhysical: PhysicalReadyOS[] = [{
      osNumberClean,
      cliente: activeOS.client?.name || 'CLIENTE TESTE',
      entrada: '15/07/2026 12:00:00',
      situacao: 'MENSAGEM ENVIADA',
      total: activeOS.totalCost,
      equipamento: activeOS.device?.model || 'EQUIPAMENTO TESTE',
      marca: activeOS.device?.brand || 'MARCA TESTE',
      modelo: activeOS.device?.model || 'MODELO TESTE',
      serie: activeOS.device?.serialNumber || 'S/N'
    }];

    // 4. Run rules engine evaluation
    console.log('\n-> Rodando motor de regras...');
    const result = await MigrationRulesEngine.evaluateOS(activeOS, mockCaixa, mockPayment, mockPhysical);

    if (!result) {
      throw new Error('Falha: O motor de regras não gerou nenhuma sugestão de conciliação.');
    }

    console.log('\nSugestão Gerada:');
    console.log(`- Status Sugerido: ${result.statusSugerido}`);
    console.log(`- Grau de Confiança: ${result.grauConfianca}%`);
    console.log(`- Nível de Confiança: ${result.confidenceLevel}`);
    console.log(`- Classificação: ${result.classification}`);
    console.log(`- Motivo: ${result.motivo}`);
    console.log(`- Regras Satisfeitas (${result.regrasSatisfeitas.length}):`);
    result.regrasSatisfeitas.forEach(r => console.log(`  * ${r.rule} (+${r.points}pts): ${r.evidence}`));
    console.log(`- Arquivos de Origem: ${result.sourceFiles.join(', ')}`);
    console.log(`- Divergências: ${result.divergencias.length}`);

    // 5. Validations
    if (result.statusSugerido !== 'PAGO_PRONTO_RETIRADA') {
      throw new Error(`Validação Falhou: O status sugerido deve ser PAGO_PRONTO_RETIRADA, mas foi ${result.statusSugerido}.`);
    }

    if (result.grauConfianca < 40) {
      throw new Error(`Validação Falhou: Confiança esperada >= 40%, mas foi ${result.grauConfianca}%.`);
    }

    if (!['HIGH', 'MEDIUM', 'LOW'].includes(result.confidenceLevel)) {
      throw new Error(`Validação Falhou: Nível de confiança incorreto: ${result.confidenceLevel}`);
    }

    if (!['AUTOMATIC', 'REVIEW', 'CONFLICT', 'NONE'].includes(result.classification)) {
      throw new Error(`Validação Falhou: Classificação incorreta: ${result.classification}`);
    }

    if (result.regrasSatisfeitas.length === 0) {
      throw new Error('Validação Falhou: regrasSatisfeitas está vazio.');
    }

    if (result.sourceFiles.length === 0) {
      throw new Error('Validação Falhou: sourceFiles está vazio.');
    }

    console.log('\n======================================================');
    console.log('✓ TESTE DE FUMAÇA CONCLUÍDO COM SUCESSO (PASSED)');
    console.log('======================================================');
  } catch (err: any) {
    console.error('\n❌ ERRO NO TESTE DE FUMAÇA:', err.message);
    process.exit(1);
  }
}

testRulesEngine();
