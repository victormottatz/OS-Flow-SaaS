import prisma from '../../src/database/prisma';
import { UserRole } from '../../src/types';

async function testPermissionsSystem() {
  console.log('======================================================');
  console.log('    SMOKE TEST: SISTEMA DE PERMISSÕES (BITRIX24)      ');
  console.log('======================================================');

  try {
    const testRole = UserRole.TECHNICIAN;
    const testPermission = 'os.stress_test';

    console.log(`\n-> 1. Limpando dados antigos para a role ${testRole}...`);
    await prisma.rolePermission.deleteMany({
      where: {
        role: testRole as any,
        permission: testPermission
      }
    });

    console.log(`-> 2. Adicionando permissão '${testPermission}' para a role ${testRole}...`);
    const created = await prisma.rolePermission.create({
      data: {
        role: testRole as any,
        permission: testPermission
      }
    });
    
    console.log(`   * Criado com ID: ${created.id}`);

    console.log('\n-> 3. Listando permissões cadastradas no banco...');
    const list = await prisma.rolePermission.findMany({
      where: { role: testRole as any }
    });
    
    console.log(`   * Total encontradas: ${list.length}`);
    const hasPerm = list.some(rp => rp.permission === testPermission);
    if (!hasPerm) {
      throw new Error(`Validação Falhou: A permissão '${testPermission}' deveria estar na lista.`);
    }
    console.log(`   * Permissão '${testPermission}' confirmada na role ${testRole}.`);

    // 4. Testar simulação do middleware checkPermission
    console.log('\n-> 4. Simulando validação de herança do middleware...');
    
    // Cenário: Usuário fictício com perfil TECHNICIAN
    const userRoleMock = UserRole.TECHNICIAN;
    const userPermissionsMock: string[] = ['os.view']; // Permissões personalizadas individuais

    // Simulação da lógica do middleware
    console.log(`   * Simulando herança:`);
    console.log(`     - Permissões diretas do usuário: [${userPermissionsMock.join(', ')}]`);
    
    // Busca no banco as permissões da Role
    const rolePermissionsFromDb = await prisma.rolePermission.findMany({
      where: { role: userRoleMock as any },
      select: { permission: true }
    });
    
    const allMergedPermissions = [
      ...userPermissionsMock,
      ...rolePermissionsFromDb.map(rp => rp.permission)
    ];

    console.log(`     - Permissões mescladas (Diretas + Role): [${allMergedPermissions.join(', ')}]`);

    // Validações
    const requiredPermissions1 = ['os.view', 'os.stress_test'];
    const hasAll1 = requiredPermissions1.every(p => allMergedPermissions.includes(p));
    console.log(`     - Testando acesso a [${requiredPermissions1.join(', ')}]: ${hasAll1 ? 'CONCEDIDO (Esperado)' : 'NEGADO'}`);
    if (!hasAll1) {
      throw new Error('Validação Falhou: O usuário deveria ter acesso devido à herança de role.');
    }

    const requiredPermissions2 = ['os.delete'];
    const hasAll2 = requiredPermissions2.every(p => allMergedPermissions.includes(p));
    console.log(`     - Testando acesso a [${requiredPermissions2.join(', ')}]: ${hasAll2 ? 'CONCEDIDO' : 'NEGADO (Esperado)'}`);
    if (hasAll2) {
      throw new Error('Validação Falhou: O usuário NÃO deveria ter permissão de exclusão (os.delete).');
    }

    // 5. Cleanup
    console.log('\n-> 5. Removendo dados de teste...');
    await prisma.rolePermission.deleteMany({
      where: {
        role: testRole as any,
        permission: testPermission
      }
    });

    console.log('\n======================================================');
    console.log('✓ TESTE DE PERMISSÕES CONCLUÍDO COM SUCESSO (PASSED)');
    console.log('======================================================');

  } catch (err: any) {
    console.error('\n❌ ERRO NO TESTE DE PERMISSÕES:', err.message);
    process.exit(1);
  }
}

testPermissionsSystem();
