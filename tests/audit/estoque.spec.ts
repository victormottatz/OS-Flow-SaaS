import { test, expect } from '@playwright/test';

test.describe('Gestão de Estoque', () => {
  const testEmail = 'admin@test.com';
  const password = 'password123';

  test.beforeEach(async ({ page }) => {
    // Fazer login usando o usuário semeado
    await page.goto('/');
    await page.fill('input[placeholder="Ex: tecnico@mgv.com"]', testEmail);
    await page.fill('input[placeholder="• • • • • •"]', password);
    await page.click('button:has-text("Acessar Oficina")');
    await expect(page.locator('aside nav button:has-text("Dashboard")')).toBeVisible();
  });

  test('Deve cadastrar uma peça com serialização obrigatória no estoque', async ({ page }) => {
    // 1. Navegar para Estoque
    await page.click('aside nav button:has-text("Estoque")');
    await expect(page.locator('h2:has-text("Gestão de Estoque")')).toBeVisible();

    // 2. Clicar em Nova Peça
    await page.click('button:has-text("Nova Peça")');

    // 3. Preencher formulário de cadastro de peça
    await page.fill('input[placeholder="Ex: Placa Mãe ASUS B550"]', 'Placa de Teste Serializada');
    await page.fill('input[placeholder="Ex: PM-ASUS-B550"]', 'COD-SERIAL-TEST');
    await page.fill('input[placeholder="Opcional"] >> nth=0', 'SKU-SERIAL-TEST');
    
    // Preencher valores numéricos usando nth indicados
    await page.fill('input[type="number"] >> nth=0', '10');  // Estoque Atual
    await page.fill('input[type="number"] >> nth=1', '2');   // Estoque Mínimo
    await page.fill('input[type="number"] >> nth=2', '150'); // Preço de Custo
    await page.fill('input[type="number"] >> nth=3', '350'); // Preço de Venda

    // 4. Ativar serialização exigida
    await page.click('text=Exige Número de Série na OS');

    // 5. Cadastrar
    await page.click('button:has-text("Cadastrar Peça")');

    // 6. Verificar que a peça foi listada na tabela
    await expect(page.locator('td:has-text("Placa de Teste Serializada")')).toBeVisible();
  });
});
