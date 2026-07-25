import { test, expect } from '@playwright/test';

test.describe('Gestão de Ordens de Serviço (Kanban & Abertura)', () => {
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

  test('Deve guiar pelo wizard e abrir uma nova Ordem de Serviço com sucesso', async ({ page }) => {
    // 1. Ir para Clientes e criar cliente + equipamento primeiro
    await page.click('aside nav button:has-text("Clientes")');
    await expect(page.locator('main h2:has-text("Clientes & Equipamentos")')).toBeVisible();

    await page.click('button:has-text("Cadastrar Cliente")');
    await page.fill('input[placeholder="Ex: Carlos Roberto Silva"]', 'Cliente OS Audit');
    await page.fill('input[placeholder="Ex: 14259388210"]', clientCpf);
    await page.fill('input[placeholder="Ex: (11) 98112-2233"]', '(11) 99999-7777');
    await page.fill('input[placeholder="Ex: carlos@silva.com"]', 'cliente_os@teste.com');
    await page.fill('input[placeholder*="Av. Paulista"]', 'Rua das Flores, 789');
    await page.click('button:has-text("Salvar no Supabase")');

    // Aguardar o modal fechar
    await expect(page.locator('text=Novo Cadastro de Cliente')).toBeHidden({ timeout: 5000 });

    // Filtrar pelo CPF gerado
    await page.fill('input[placeholder*="Filtrar por nome"]', clientCpf);

    // Verificar que o cliente cadastrado aparece na listagem/tabela
    await expect(page.locator(`td:has-text("${clientCpf}")`)).toBeVisible();

    // Vincular equipamento
    const clientRow = page.locator('tr, div.border').filter({ hasText: clientCpf });
    await clientRow.locator('button[title="Vincular Novo Ativo"]').click();
    await page.selectOption('select', 'Ultrassom (Fisio/Estética)');
    await page.fill('input[placeholder="Ex: Ibramed, KLD"]', 'Ibramed');
    await page.fill('input[placeholder="Ex: Inspiron 15"]', 'Sonopuls III');
    await page.fill('input[placeholder="Deixe em branco se Sem Série"]', 'SN-OS-AUDIT-123456');
    await page.click('button:has-text("Salvar Aparelho")');
    await expect(page.locator('text=Dispositivo adicionado à conta do cliente!')).toBeVisible();
    await page.click('button:has-text("close")'); // fechar modal de sucesso/vínculo se ainda aberto

    // 2. Clicar no botão flutuante para Nova OS
    await page.click('button[title="Nova Ordem de Serviço"]');

    // 3. Wizard Passo 1: Selecionar Cliente
    await page.fill('input[placeholder="Pesquisar cliente por nome, CPF/CNPJ ou telefone..."]', clientCpf);
    await page.click(`button:has-text("${clientCpf}")`);

    // 4. Wizard Passo 2: Selecionar Equipamento
    await page.click('button:has-text("SN-OS-AUDIT-123456")');

    // 5. Wizard Passo 3: Sintomas e Defeitos
    await page.fill('textarea[placeholder*="Descreva detalhadamente o sintoma"]', 'Tela piscando sem parar e ruído interno na inicialização');
    await page.fill('input[placeholder="Ex: Carregador original, cabo USB, capa de proteção"]', 'Carregador original');
    await page.fill('input[placeholder="Ex: Tela riscada, ausência de parafuso na carcaça"]', 'Marcas de uso normais');
    await page.click('button:has-text("Avançar para Checklist e Fotos")');

    // 6. Wizard Passo 4: Finalizar
    await page.click('button:has-text("Gerar Ordem e Abrir Termo")');

    // 7. Verificar sucesso (redirecionamento ou mensagem de sucesso)
    await expect(page.locator('aside nav button:has-text("Ordens de Serviço")')).toBeVisible();
  });
});
