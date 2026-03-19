import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/Usuário ou e-mail/i).fill(username);
  await page.getByLabel(/Senha/i).fill(password);
  await page.getByRole('button', { name: /Entrar com credencial/i }).click();
}

async function selectRole(page: Page, trigger: Locator, optionLabel: string) {
  await trigger.click();
  await page.getByRole('option', { name: optionLabel }).click();
}

async function loginInIsolatedContext(browser: Browser, username: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page, username, password);

  return { context, page };
}

test.describe('QA local de usuários @local-functional', () => {
  test.skip(!adminUsername || !adminPassword, 'Defina ADMIN_USERNAME e ADMIN_PASSWORD para validar usuários no fluxo local.');

  test('cria, edita e protege o próprio administrador contra auto-rebaixamento', async ({ page }) => {
    const createdUsername = 'qa.local.created';
    const createdEmail = 'qa.local.created@secti.df.gov.br';

    await login(page, adminUsername!, adminPassword!);

    await page.getByRole('button', { name: /Usuários/i }).click();
    await expect(page.getByRole('heading', { name: /Gerenciamento de usuários/i })).toBeVisible();

    await page.locator('#new-username').fill(createdUsername);
    await page.locator('#new-fullname').fill('QA Local Created');
    await page.locator('#new-email').fill(createdEmail);
    await page.locator('#new-department').fill('Qualidade Local');
    await page.locator('#new-password').fill('Created.Local.2026!');
    await selectRole(page, page.locator('#new-role'), 'Visualizador');
    await page.getByRole('button', { name: /Criar usuário/i }).click();

    await expect(page.getByText(/Usuário criado com sucesso\./i)).toBeVisible();

    await page.getByPlaceholder(/Buscar por nome, usuário ou e-mail/i).fill(createdUsername);
    await page.getByRole('button', { name: /^Pesquisar$/i }).click();

    const createdRow = page.getByRole('row').filter({ hasText: createdUsername });
    await expect(createdRow).toContainText('Visualizador');
    await createdRow.getByRole('button', { name: /Editar/i }).click();

    await page.locator('#edit-fullname').fill('QA Local Atualizado');
    await page.locator('#edit-department').fill('Governança QA');
    await selectRole(page, page.locator('#edit-role'), 'Editor');
    await page.getByRole('button', { name: /Salvar alterações/i }).click();

    await expect(page.getByText(/Usuário atualizado com sucesso\./i)).toBeVisible();
    await expect(page.locator('#edit-fullname')).toHaveValue('QA Local Atualizado');
    await expect(page.locator('#edit-department')).toHaveValue('Governança QA');

    await page.getByRole('button', { name: /^Limpar$/i }).click();
    await page.getByPlaceholder(/Buscar por nome, usuário ou e-mail/i).fill(adminUsername!);
    await page.getByRole('button', { name: /^Pesquisar$/i }).click();

    const adminRow = page.getByRole('row').filter({ hasText: adminUsername! });
    await adminRow.getByRole('button', { name: /Editar/i }).click();

    await selectRole(page, page.locator('#edit-role'), 'Visualizador');
    await page.getByRole('button', { name: /Salvar alterações/i }).click();

    await expect(page.getByText(/Você não pode remover seu próprio acesso de administrador\./i)).toBeVisible();
    await expect(adminRow).toContainText('Administrador');

    await adminRow.getByRole('button', { name: /^Desativar$/i }).click();
    await expect(page.getByText(/Você não pode desativar o seu próprio usuário\./i)).toBeVisible();
    await expect(adminRow).toContainText('Ativo');
  });

  test('desativa, reativa e redefine a senha de um usuário gerenciado', async ({ page, browser }) => {
    const createdUsername = 'qa.local.locked';
    const createdEmail = 'qa.local.locked@secti.df.gov.br';
    const initialPassword = 'Locked.Local.2026!';
    const resetPassword = 'Locked.Reset.2026!';

    await login(page, adminUsername!, adminPassword!);

    await page.getByRole('button', { name: /Usuários/i }).click();
    await expect(page.getByRole('heading', { name: /Gerenciamento de usuários/i })).toBeVisible();

    await page.locator('#new-username').fill(createdUsername);
    await page.locator('#new-fullname').fill('QA Local Locked');
    await page.locator('#new-email').fill(createdEmail);
    await page.locator('#new-department').fill('Operação QA');
    await page.locator('#new-password').fill(initialPassword);
    await selectRole(page, page.locator('#new-role'), 'Visualizador');
    await page.getByRole('button', { name: /Criar usuário/i }).click();

    await expect(page.getByText(/Usuário criado com sucesso\./i)).toBeVisible();

    await page.getByPlaceholder(/Buscar por nome, usuário ou e-mail/i).fill(createdUsername);
    await page.getByRole('button', { name: /^Pesquisar$/i }).click();

    const createdRow = page.getByRole('row').filter({ hasText: createdUsername });
    await expect(createdRow).toContainText('Ativo');
    await createdRow.getByRole('button', { name: /^Desativar$/i }).click();

    await expect(page.getByText(/Usuário desativado com sucesso\./i)).toBeVisible();
    await expect(createdRow).toContainText('Inativo');
    await expect(createdRow.getByRole('button', { name: /^Ativar$/i })).toBeVisible();

    const inactiveLogin = await loginInIsolatedContext(browser, createdUsername, initialPassword);
    await expect(inactiveLogin.page.getByText(/Usuário inativo/i)).toBeVisible();
    await inactiveLogin.context.close();

    await createdRow.getByRole('button', { name: /^Ativar$/i }).click();
    await expect(page.getByText(/Usuário ativado com sucesso\./i)).toBeVisible();
    await expect(createdRow).toContainText('Ativo');

    page.once('dialog', async (dialog) => {
      await dialog.accept(resetPassword);
    });
    await createdRow.getByRole('button', { name: /Resetar senha/i }).click();
    await expect(page.getByText(/Senha redefinida com sucesso\./i)).toBeVisible();

    const resetLogin = await loginInIsolatedContext(browser, createdUsername, resetPassword);
    await expect(resetLogin.page.getByRole('button', { name: /Projetos/i })).toBeVisible();
    await resetLogin.context.close();
  });
});
