import { expect, test, type Page } from '@playwright/test';

const e2eUsername = process.env.E2E_USERNAME;
const e2ePassword = process.env.E2E_PASSWORD;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Usuário ou e-mail/i).fill(e2eUsername!);
  await page.getByLabel(/Senha/i).fill(e2ePassword!);
  await page.getByRole('button', { name: /Entrar com credencial/i }).click();
}

test.describe('QA local de relatórios e edição @local-functional', () => {
  test.skip(!e2eUsername || !e2ePassword, 'Defina E2E_USERNAME e E2E_PASSWORD para validar edição e relatórios no fluxo local.');

  test('baixa CSV e persiste edições de projeto e Wi-Fi', async ({ page }) => {
    const projectCard = page.locator('button').filter({ hasText: 'Projeto Wi-Fi Social QA Local' }).first();
    const responsavelOriginal = 'Equipe QA Local';
    const resumoOriginal = 'Seed local para validar leitura executiva da carteira e detalhe do projeto.';
    const responsavelEditado = 'Equipe QA Local Editada';
    const resumoEditado = 'Resumo atualizado pela suíte funcional local.';
    const pontoOriginal = 'Ponto QA Ceilandia';
    const pontoEditado = 'Ponto QA Ceilandia Editado';

    await login(page);

    await page.getByRole('button', { name: /Relatórios/i }).click();
    await expect(page.getByRole('heading', { name: /Saída honesta do que já está pronto/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Baixar CSV do Saiweb/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^relatorio_saiweb_/i);

    await page.getByRole('button', { name: /Projetos/i }).click();
    await expect(projectCard).toBeVisible();
    await projectCard.click();
    await page.getByRole('button', { name: /Atualizar monitoramento/i }).click();

    const projetoModal = page.locator('div.fixed').last();
    await projetoModal.getByPlaceholder(/Servidor\(a\) responsável pelo acompanhamento/i).fill(responsavelEditado);
    await projetoModal.getByPlaceholder(/Resumo curto do estado atual/i).fill(resumoEditado);
    await projetoModal.getByRole('button', { name: /Salvar monitoramento/i }).click();

    await expect(page.getByText(/Monitoramento atualizado\./i)).toBeVisible();
    await page.getByRole('button', { name: /Atualizar monitoramento/i }).click();
    const projetoModalReaberto = page.locator('div.fixed').last();
    await expect(projetoModalReaberto.getByPlaceholder(/Servidor\(a\) responsável pelo acompanhamento/i)).toHaveValue(responsavelEditado);
    await expect(projetoModalReaberto.getByPlaceholder(/Resumo curto do estado atual/i)).toHaveValue(resumoEditado);
    await projetoModalReaberto.getByPlaceholder(/Servidor\(a\) responsável pelo acompanhamento/i).fill(responsavelOriginal);
    await projetoModalReaberto.getByPlaceholder(/Resumo curto do estado atual/i).fill(resumoOriginal);
    await projetoModalReaberto.getByRole('button', { name: /Salvar monitoramento/i }).click();
    await expect(page.getByText(/Monitoramento atualizado\./i)).toBeVisible();

    await page.getByRole('button', { name: /Voltar para a carteira de projetos/i }).click();
    await page.getByRole('button', { name: /Wi‑Fi Social/i }).click();
    await page.getByRole('button', { name: /Lista/i }).click();

    const targetRow = page.getByRole('table').getByText(/^Ponto QA Ceilandia$/).locator('xpath=ancestor::tr');
    await targetRow.getByRole('button', { name: /Editar/i }).click();

    const wifiModal = page.locator('div.fixed').last();
    await wifiModal.locator('input').nth(0).fill(pontoEditado);
    await wifiModal.getByRole('button', { name: /Salvar alterações/i }).click();

    await expect(page.getByText(/Ponto atualizado\./i)).toBeVisible();
    await expect(page.getByRole('table').getByText(new RegExp(`^${pontoEditado}$`))).toBeVisible();

    const targetRowEditado = page.getByRole('table').getByText(new RegExp(`^${pontoEditado}$`)).locator('xpath=ancestor::tr');
    await targetRowEditado.getByRole('button', { name: /Editar/i }).click();

    const wifiModalReaberto = page.locator('div.fixed').last();
    await wifiModalReaberto.locator('input').nth(0).fill(pontoOriginal);
    await wifiModalReaberto.getByRole('button', { name: /Salvar alterações/i }).click();

    await expect(page.getByText(/Ponto atualizado\./i)).toBeVisible();
    await expect(page.getByRole('table').getByText(/^Ponto QA Ceilandia$/)).toBeVisible();
  });
});
