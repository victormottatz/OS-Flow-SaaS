import { test, expect } from '@playwright/test';

test.describe('Gestão de Equipamentos (Base Instalada)', () => {
  const testEmail = 'admin@test.com';
  const password = 'password123';
  const clientCpf = String(Math.floor(Math.random() * 90000000000) + 10000000000);

  test.beforeEach(async ({ page }) => {
    // Fazer login usando o usuário semeado
    await page.goto('/');
    await page.fill('input[placeholder="Ex: tecnico@mgv.com"]', testEmail);
    await page.fill('input[placeholder="• • • • • •"]', password);
    await page.click('button:has-text("Acessar Oficina")');
    await expect(page.locator('aside nav button:has-text("Dashboard")')).toBeVisible();
  });

  test('Deve vincular um micro equipamento (Base Instalada) ao cliente com sucesso', async ({ page }) => {
    // 1. Navegar para Clientes
    await page.click('aside nav button:has-text("Clientes")');
    await expect(page.locator('main h2:has-text("Clientes & Equipamentos")')).toBeVisible();

    // 2. Criar um cliente de teste
    await page.click('button:has-text("Cadastrar Cliente")');
    await page.fill('input[placeholder="Ex: Carlos Roberto Silva"]', 'Cliente Equipamento Audit');
    await page.fill('input[placeholder="Ex: 14259388210"]', clientCpf);
    await page.fill('input[placeholder="Ex: (11) 98112-2233"]', '(11) 99999-9999');
    await page.fill('input[placeholder="Ex: carlos@silva.com"]', 'cliente_equipamento@teste.com');
    await page.fill('input[placeholder*="Av. Paulista"]', 'Rua das Palmeiras, 456');
    await page.click('button:has-text("Salvar no Supabase")');

    // Aguardar o modal de criação fechar
    await expect(page.locator('text=Novo Cadastro de Cliente')).toBeHidden({ timeout: 5000 });

    // Filtrar pelo CPF gerado
    await page.fill('input[placeholder*="Filtrar por nome"]', clientCpf);

    // Verificar que o cliente cadastrado aparece na listagem/tabela
    await expect(page.locator(`td:has-text("${clientCpf}")`)).toBeVisible();

    // 3. Clicar em "Vincular Novo Ativo" para o primeiro cliente que contenha o CPF gerado
    const clientRow = page.locator('tr, div.border').filter({ hasText: clientCpf });
    await clientRow.locator('button[title="Vincular Novo Ativo"]').click();

    // 4. Preencher formulário de vinculação de equipamento
    await page.selectOption('select', 'Ultrassom (Fisio/Estética)');
    await page.fill('input[placeholder="Ex: Ibramed, KLD"]', 'Ibramed');
    await page.fill('input[placeholder="Ex: Inspiron 15"]', 'Sonopuls III');
    await page.fill('input[placeholder="Deixe em branco se Sem Série"]', 'SN-OS-AUDIT-E2E');

    // 5. Salvar Aparelho
    await page.click('button:has-text("Salvar Aparelho")');

    // 6. Verificar mensagem de sucesso ou modal fechando
    await expect(page.locator('text=Dispositivo adicionado à conta do cliente!')).toBeVisible();
  });
});
