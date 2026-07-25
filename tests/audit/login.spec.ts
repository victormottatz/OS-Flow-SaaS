import { test, expect } from '@playwright/test';

test.describe('Login & Cadastro de Técnicos', () => {
  const testEmail = 'admin@test.com';
  const password = 'password123';

  test('Deve exibir erro ao tentar entrar com credenciais inválidas', async ({ page }) => {
    // 1. Ir para a página de login
    await page.goto('/');

    // 2. Preencher login incorreto
    await page.fill('input[placeholder="Ex: tecnico@mgv.com"]', 'errado@mgv.com');
    await page.fill('input[placeholder="• • • • • •"]', 'senha_errada');

    // 3. Clicar em Acessar
    await page.click('button:has-text("Acessar Oficina")');

    // 4. Verificar mensagem de erro
    await expect(page.locator('text=Credenciais inválidas')).toBeVisible();
  });

  test('Deve fazer login com sucesso usando credenciais do Administrador', async ({ page }) => {
    // 1. Ir para a página de login
    await page.goto('/');

    // 2. Preencher login correto
    await page.fill('input[placeholder="Ex: tecnico@mgv.com"]', testEmail);
    await page.fill('input[placeholder="• • • • • •"]', password);

    // 3. Clicar em Acessar
    await page.click('button:has-text("Acessar Oficina")');

    // 4. Verificar que estamos logados (presença do sidebar item "Dashboard")
    await expect(page.locator('aside nav button:has-text("Dashboard")')).toBeVisible();
  });
});
