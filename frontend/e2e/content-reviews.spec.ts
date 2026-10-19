import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { runtime } from './runtime.cjs'
import { sql } from './db'
type Kind = 'profiles' | 'redirects'
const fixtures = () => JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')) as Record<Kind, { tenantId: string; owner: string; other: string; password: string }>
async function login(page: Page, kind: Kind, admin = false) {
  const fixture = fixtures()[kind], origin = runtime.web(kind + '.localhost')
  await page.goto(origin + '/login'); await page.getByLabel('E-mail').fill(admin ? fixture.other : fixture.owner); await page.getByLabel('Senha').fill(fixture.password); await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', exact: true })).toBeVisible()
  const refuse = page.getByRole('region', { name: 'Este site usa cookies' }).getByRole('button', { name: 'Recusar', exact: true }); if (await refuse.count()) await refuse.click()
}
for (const kind of ['profiles', 'redirects'] as const) test('Revisão e contestação: ' + kind, async ({ page, browser }, info) => {
  const fixture = fixtures()[kind], origin = runtime.web(kind + '.localhost'), title = 'Projeto SuspeitoFixture'
  sql(`DELETE FROM ${kind === 'profiles' ? 'profiles' : 'redirect_handles'} WHERE "tenantId"='${fixture.tenantId}'`)
  await login(page, kind)
  const ownerPath = kind === 'profiles' ? '/painel/perfil' : '/painel/convites'
  await page.goto(origin + ownerPath)
  if (kind === 'profiles') {
    await page.getByRole('tab', { name: 'Página', exact: true }).click()
    await page.getByLabel('Endereço da página').fill('meu-projeto'); await page.getByLabel('Nome da página').fill(title); await page.getByLabel('Descrição', { exact: true }).fill('Conteúdo educativo para a comunidade.')
    const areas = page.getByRole('combobox', { name: 'Editar minha página', exact: true }); if (await areas.isVisible()) { await areas.click(); await page.getByRole('option', { name: 'Grupos e links', exact: true }).click() } else await page.getByRole('tab', { name: 'Grupos e links', exact: true }).click()
    await page.getByRole('button', { name: 'Adicionar grupo', exact: true }).click(); await page.getByLabel('Nome do grupo', { exact: true }).fill('Projetos'); await page.getByRole('button', { name: 'Concluir grupo', exact: true }).click()
    await page.getByRole('button', { name: 'Adicionar link', exact: true }).click(); await page.getByLabel('Título do link', { exact: true }).fill('Meu site'); await page.getByLabel('Link de acesso', { exact: true }).fill('https://example.com/revisao'); await page.getByRole('button', { name: 'Concluir link', exact: true }).click()
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Novo link permanente', exact: true }).click(); await page.getByLabel('Título do convite', { exact: true }).fill(title); await page.getByLabel('Destino do convite', { exact: true }).fill('https://example.com/revisao'); await page.getByRole('button', { name: 'Validar e salvar destino', exact: true }).click()
  }
  await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath(kind + '-pending-owner.png'), fullPage: true, animations: 'disabled' })
  const context = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch })
  try {
    const admin = await context.newPage(); await login(admin, kind, true); await admin.goto(origin + '/admin/moderacao'); await admin.getByRole('tab', { name: kind === 'profiles' ? 'Minha página' : 'Convites', exact: true }).click()
    const card = admin.getByRole('article').filter({ has: admin.getByRole('heading', { name: title, exact: true }) })
    await expect(card).toBeVisible()
    const accessibility = await new AxeBuilder({ page: admin }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(accessibility.violations.map(item => item.id)).toEqual([])
    await admin.screenshot({ path: info.outputPath(kind + '-admin-review.png'), fullPage: true, animations: 'disabled' })
    await card.getByRole('button', { name: 'Recusar', exact: true }).click(); await admin.getByLabel('Motivo da recusa', { exact: true }).fill('Explique a finalidade educativa.'); await admin.getByRole('button', { name: 'Confirmar recusa', exact: true }).click(); await expect(card).toHaveCount(0)
    await page.reload()
    if (kind === 'redirects') await page.getByRole('button', { name: /Projeto SuspeitoFixture/ }).click()
    await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Explique a finalidade educativa.')
    await page.screenshot({ path: info.outputPath(kind + '-rejected-owner.png'), fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Contestar recusa', exact: true }).click(); await page.getByLabel('Por que devemos reavaliar?').fill('Este projeto compartilha aulas e materiais educativos.')
    await page.screenshot({ path: info.outputPath(kind + '-appeal.png'), fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Enviar contestação', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('region', { name: 'Situação da revisão' })).toContainText('Em revisão humana')
    await admin.getByRole('button', { name: 'Atualizar dados', exact: true }).click(); await expect(card).toContainText('Este projeto compartilha aulas e materiais educativos.')
    await card.getByRole('button', { name: 'Aprovar', exact: true }).click(); await expect(card).toHaveCount(0)
    if (kind === 'profiles') {
      await page.goto(origin + '/p/meu-projeto'); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      const brand = page.getByRole('link', { name: 'Criado por Tem Link Aqui' }); expect((await brand.boundingBox())!.height).toBeLessThanOrEqual(24); expect((await brand.locator('img').boundingBox())!.width).toBe(66)
      await expect(brand).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await page.screenshot({ path: info.outputPath('small-watermark.png'), fullPage: true, animations: 'disabled' })
    } else {
      const response = await page.evaluate(async () => (await fetch('/bff/v1/me/redirects')).json()); const handle = response.items[0].id
      const publicResponse = await page.request.get(runtime.web('127.0.0.1') + '/r/' + handle, { headers: { host: kind + '.localhost:' + runtime.webPort }, maxRedirects: 0 }); expect(publicResponse.headers().location).toBe('https://example.com/revisao')
    }
    expect(sql(`SELECT COUNT(*) FROM links WHERE "tenantId"='${fixture.tenantId}'`)).toBe(kind === 'profiles' ? '1' : '0')
  } finally { await context.close() }
})
