import prisma from '../../src/database/prisma';
import { getActiveConciliationConfig } from '../../src/config/conciliation.config';

async function testDynamicConfig() {
  console.log('======================================================');
  console.log('    SMOKE TEST: CALIBRAÇÃO DINÂMICA DE REGRAS         ');
  console.log('======================================================');

  const configKey = 'os_number_match_score';
  let originalValueStr = '40';

  try {
    console.log(`\n-> 1. Obtendo valor original de '${configKey}' no banco...`);
    const originalSetting = await prisma.officeSetting.findUnique({
      where: { key: configKey }
    });

    if (originalSetting) {
      originalValueStr = originalSetting.value;
      console.log(`   * Valor original do banco: ${originalValueStr}`);
    } else {
      console.log(`   * Não encontrado. Usando valor fallback: ${originalValueStr}`);
    }

    const testValueStr = '95';
    console.log(`\n-> 2. Alterando valor de '${configKey}' para '${testValueStr}' no banco...`);
    await prisma.officeSetting.upsert({
      where: { key: configKey },
      update: { value: testValueStr },
      create: {
        key: configKey,
        value: testValueStr,
        category: 'CONCILIACAO',
        type: 'number'
      }
    });

    console.log('\n-> 3. Carregando configurações dinâmicas via getActiveConciliationConfig()...');
    const activeConfig = await getActiveConciliationConfig();
    
    console.log(`   * OS_NUMBER_MATCH_SCORE lido: ${activeConfig.OS_NUMBER_MATCH_SCORE}`);
    
    if (activeConfig.OS_NUMBER_MATCH_SCORE !== 95) {
      throw new Error(`Validação Falhou: O valor dinâmico deveria ser 95, mas foi lido como ${activeConfig.OS_NUMBER_MATCH_SCORE}`);
    }
    console.log(`✓ CONFIRMADO: Configuração dinâmica aplicada com sucesso na execução.`);

    // 4. Restaurando
    console.log(`\n-> 4. Restaurando valor original '${originalValueStr}' de '${configKey}' no banco...`);
    await prisma.officeSetting.update({
      where: { key: configKey },
      data: { value: originalValueStr }
    });

    console.log('\n======================================================');
    console.log('✓ TESTE DE CALIBRAÇÃO DINÂMICA CONCLUÍDO (PASSED)');
    console.log('======================================================');

  } catch (err: any) {
    console.error('\n❌ ERRO NO TESTE DE CALIBRAÇÃO DINÂMICA:', err.message);
    
    // Tenta restaurar em caso de erro
    try {
      await prisma.officeSetting.update({
        where: { key: configKey },
        data: { value: originalValueStr }
      });
    } catch {}
    
    process.exit(1);
  }
}

testDynamicConfig();
