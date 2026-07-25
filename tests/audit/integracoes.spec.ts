import { test, expect } from '@playwright/test';

test.describe('Integrações (Bling V3 & WhatsApp)', () => {
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

  test('Deve carregar o painel da integração Bling e alternar abas', async ({ page }) => {
    // 1. Ir para a aba de Integração Fiscal
    await page.click('aside nav button:has-text("Integração Fiscal")');
    await expect(page.locator('h2:has-text("Integração Fiscal & Bling")')).toBeVisible();

    // 2. Verificar conexão e status da API
    await expect(page.locator('text=Painel de Integração Bling')).toBeVisible();

    // 3. Alternar para aba Catálogo & Sincronização
    await page.click('button:has-text("Sincronização de Catálogo")');
    await expect(page.locator('text=Sincronização em Lote do Catálogo')).toBeVisible();

    // 4. Alternar para aba Importar XML NFe
    await page.click('button:has-text("Importador de XML NFe")');
    await expect(page.locator('text=Importador de XML de Nota Fiscal (NFe)')).toBeVisible();

    // 5. Alternar para aba Logs
    await page.click('button:has-text("Console de Logs")');
    await expect(page.locator('text=Terminal de Logs Fiscais Bling')).toBeVisible();
  });
});
