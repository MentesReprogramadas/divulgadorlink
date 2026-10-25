import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test'
import { isolatedFixture, login, saveProfile, publishProfile, redirect, roadmapApi, type Fixture } from './ondas-visual-fixture'
import { captureOndasState, observeOndasPage } from './ondas-visual-capture'
import { captureDialogRemainder } from './ondas-admin-visual-tools'
import { grantProfileCapability, grantProfileScheduling } from './profile-schedule-fixture'
import { selectOption } from './select-control'
import { sql } from './db'
import { grantRichBlocks, uploadVisualProfilePhoto } from './ondas-profile-content-fixture'
import type { ContactSettings, ContactSubmission } from '../src/features/contact-forms/contact-contract'
import type { ContactDetail } from '../src/features/contact-forms/contact-handling-contract'
import type { RenewalRemindersData } from '../src/features/renewal-reminders/reminder-contract'
import type { ProfileHostState } from '../src/features/profile-hosts/profile-host-contract'
import type { InteractionReport } from '../src/features/profile-interaction/interaction-contract'
import type { ChannelGroupsResponse } from '../src/features/profile-channels/channel-contract'

type RouteCase = { key: string; path: string; api?: string; missingPage?: boolean; dialogs?: string[]; tabs?: string[]; empty?: boolean }
const editors: RouteCase[] = [
  { key: 'perfil-resumo', path: '/painel/perfil' },
  { key: 'perfil-dados', path: '/painel/perfil/dados' },
  { key: 'perfil-links', path: '/painel/perfil/links', dialogs: ['Adicionar grupo', 'Adicionar link'] },
  { key: 'perfil-conteudo', path: '/painel/perfil/conteudo' },
  { key: 'perfil-aparencia', path: '/painel/perfil/aparencia', tabs: ['Cores', 'Botões e texto'] },
  { key: 'perfil-busca', path: '/painel/perfil/busca' },
  { key: 'perfil-formulario', path: '/painel/perfil/formulario' },
  { key: 'perfil-descoberta', path: '/painel/perfil/descoberta' },
].map(row => ({ ...row, api: '/me/profile', missingPage: true }))
const tools: RouteCase[] = [
  { key: 'perfil-previa', path: '/painel/perfil/previa', api: '/me/profile/preview/items', missingPage: true },
  { key: 'perfil-modelos', path: '/painel/perfil/modelos', api: '/profile-templates', missingPage: true },
  { key: 'perfil-importar', path: '/painel/perfil/importar', api: '/me/profile', missingPage: true },
  { key: 'perfil-exportar', path: '/painel/perfil/exportar' },
  { key: 'perfil-idiomas', path: '/painel/perfil/idiomas', api: '/me/profile', missingPage: true },
  { key: 'perfil-historico', path: '/painel/perfil/historico', api: '/me/profile/revisions', missingPage: true },
  { key: 'perfil-metricas', path: '/painel/perfil/metricas', api: '/me/profile/measurement', missingPage: true },
  { key: 'perfil-testes', path: '/painel/perfil/testes', api: '/me/profile/button-tests', missingPage: true },
  { key: 'perfil-checklist', path: '/painel/perfil/checklist', api: '/me/profile/checklist', missingPage: true },
  { key: 'perfil-diagnostico', path: '/painel/perfil/diagnostico', api: '/me/profile/diagnostics', missingPage: true },
  { key: 'perfil-assistente', path: '/painel/perfil/assistente', api: '/me/profile/suggestions', missingPage: true },
  { key: 'perfil-endereco', path: '/painel/perfil/endereco', api: '/me/profile/hosts', missingPage: true },
  { key: 'perfil-campanhas', path: '/painel/perfil/campanhas', api: '/me/profile/campaigns', missingPage: true, dialogs: ['Nova campanha'] },
  { key: 'perfil-canais', path: '/painel/perfil/canais', api: '/me/profile/channel-groups', missingPage: true },
  { key: 'perfil-contatos', path: '/painel/perfil/contatos', api: '/me/forms', empty: true },
  { key: 'perfil-midia-kit', path: '/painel/perfil/midia-kit', api: '/me/profile/media-kit', missingPage: true },
  { key: 'perfil-midia-kit-previa', path: '/painel/perfil/midia-kit/previa', api: '/me/profile/media-kit/preview', missingPage: true },
  { key: 'perfil-divulgar', path: '/painel/perfil/divulgar', api: '/me/profile', missingPage: true },
]
const personal: RouteCase[] = [
  { key: 'painel', path: '/painel', api: '/links/mine', empty: true },
  { key: 'favoritos', path: '/painel/favoritos', api: '/me/favorites', empty: true },
  { key: 'interesses', path: '/painel/interesses', api: '/me/followed-niches', empty: true },
  { key: 'lembretes', path: '/painel/lembretes', api: '/promotions/mine/reminders', empty: true },
  { key: 'integracoes', path: '/painel/integracoes', api: '/me/integrations/endpoints', empty: true, dialogs: ['Nova integração'] },
  { key: 'convites', path: '/painel/convites', api: '/me/redirects', empty: true, dialogs: ['Criar link permanente'] },
  { key: 'clientes', path: '/painel/clientes', api: '/me/agency/clients', empty: true, dialogs: ['Adicionar página'] },
  { key: 'clientes-acessos', path: '/painel/clientes/acessos', api: '/me/agency/access', empty: true, dialogs: ['Solicitar acesso para a equipe'] },
  { key: 'clientes-transferencias', path: '/painel/clientes/transferencias', api: '/me/agency/transfers', empty: true, dialogs: ['Transferir minha página'] },
]

const pending = '[data-skeleton]:visible, [data-pending="true"]:visible, [aria-busy="true"]:visible'
test.beforeEach(async ({ page }, info) => {
  observeOndasPage(page)
  await page.setViewportSize(info.project.name.includes('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
})
async function ready(page: Page) {
  await expect(page.locator(pending)).toHaveCount(0)
  if (new URL(page.url()).pathname === '/painel/perfil/midia-kit/previa') await expect(page.locator('main h1, main [role="alert"] p').filter({ visible: true }).first()).toBeVisible()
  else await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
}
async function shot(page: Page, info: TestInfo, route: string, state: string, simulated = false, popup = false) {
  if (!['carregando', 'salvando', 'envio-pendente'].includes(state)) await expect(page.locator(pending)).toHaveCount(0)
  await captureOndasState(page, info, { route, state, source: simulated ? 'presentation-fixture' : 'live', fullPage: !popup })
  const topDialog = page.getByRole('dialog').filter({ visible: true }).last()
  if (popup && await topDialog.count()) await captureDialogRemainder(page, info, route, state, { dialog: topDialog, source: simulated ? 'presentation-fixture' : 'live' })
}
async function open(page: Page, fixture: Fixture, route: string) {
  const response = await page.goto(fixture.origin + route)
  expect(response?.status(), route).toBe(200)
  await ready(page)
}
async function dialog(page: Page, info: TestInfo, route: string, label: string, simulated = false) {
  const trigger = page.getByRole('button', { name: label, exact: true }).first()
  await expect(trigger).toBeEnabled()
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, route, 'dialogo-' + label, simulated, true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
}
async function readStates(page: Page, fixture: Fixture, info: TestInfo, row: RouteCase) {
  if (!row.api) return
  const pattern = new RegExp('/bff/v1' + row.api + '(?:[?]|$)')
  let phase: 'carregando' | 'erro' = 'carregando'
  let release = () => {}
  let requested = false
  const gate = new Promise<void>(resolve => { release = resolve })
  const handler = async (route: Route) => {
    if (route.request().method() !== 'GET') { await route.continue(); return }
    requested = true
    if (phase === 'carregando') { await gate; await route.continue() }
    else await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Não foi possível carregar este conteúdo. Tente novamente.' }) })
  }
  await page.route(pattern, handler)
  try {
    for (const kind of ['carregando', 'erro'] as const) {
      phase = kind
      requested = false
      if (kind === 'erro') {
        const [response] = await Promise.all([
          page.waitForResponse(response => pattern.test(response.url()) && response.request().method() === 'GET'),
          page.goto(fixture.origin + row.path),
        ])
        expect(response.status(), row.path + ': resposta do estado de erro').toBe(503)
      } else await page.goto(fixture.origin + row.path)
      await expect.poll(() => requested, { message: row.path + ': GET interceptado ' + row.api }).toBe(true)
      if (kind === 'carregando') await expect(page.locator(pending).first()).toBeVisible()
      else {
        await expect(page.locator(pending)).toHaveCount(0)
        await expect(page.locator('main [role="alert"]').filter({ hasText: /\S/ }).first()).toBeVisible()
      }
      await shot(page, info, row.path, kind, true)
      if (kind === 'carregando') {
        release()
        await ready(page)
      }
    }
  } finally {
    release()
    await page.unroute(pattern, handler)
  }
}
async function selector(page: Page, info: TestInfo, route: string) {
  const selects = page.locator('main > :not(aside)').getByRole('combobox').filter({ visible: true })
  const count = await selects.count()
  if (!count) return
  const control = selects.first()
  await expect(control).toBeEnabled()
  await control.click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await shot(page, info, route, 'seletor-aberto', false, true)
  await page.keyboard.press('Escape')
}
async function firstGroup(page: Page) {
  const group = page.locator('[data-open-group]').first()
  if (await group.isVisible()) await group.click()
  await expect(page.getByRole('button', { name: 'Adicionar link', exact: true })).toBeVisible()
}
async function calendar(page: Page, info: TestInfo, route: string, label: string, simulated = false) {
  const input = page.getByLabel(label, { exact: true }).filter({ visible: true }).first()
  await input.locator('..').getByRole('button', { name: 'Abrir calendário', exact: true }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  await shot(page, info, route, 'calendario-' + label, simulated, true)
  await page.keyboard.press('Escape')
}

for (const row of [...editors, ...tools, ...personal]) test('OFP ' + row.key + ' — estados da rota', async ({ page }, info) => {
  test.setTimeout(180_000)
  const fixture = isolatedFixture()
  await login(page, fixture)
  if (row.missingPage || row.empty) {
    await open(page, fixture, row.path)
    await shot(page, info, row.path, row.missingPage ? 'sem-pagina' : 'vazio')
  }
  await saveProfile(page, fixture)
  await publishProfile(page)
  if (row.key.includes('metricas') || row.key === 'perfil-testes') grantProfileCapability(fixture, 'profile.analytics')
  if (row.key === 'perfil-conteudo') {
    await open(page, fixture, row.path)
    await shot(page, info, row.path, 'sem-beneficio')
    grantRichBlocks(fixture)
  }
  if (row.key === 'convites') await redirect(page, 'Comunidade Ondas')
  if (row.key === 'perfil-midia-kit-previa') expect((await roadmapApi(page, '/me/profile/media-kit', 'PATCH', { expectedVersion: 0, content: { publicFields: { showBio: true, showPhoto: true, contactIds: [] }, metricSelections: [], manualMetrics: [] } })).status).toBe(200)
  await open(page, fixture, row.path)
  await shot(page, info, row.path, 'base')
  for (const label of row.tabs ?? []) {
    await page.getByRole('tab', { name: label, exact: true }).click()
    await shot(page, info, row.path, 'aba-' + label)
  }
  for (const label of row.dialogs ?? []) {
    if (label === 'Adicionar link') await firstGroup(page)
    await dialog(page, info, row.path, label)
  }
  await selector(page, info, row.path)
  await readStates(page, fixture, info, row)
})

test('OFP modelos — cinco prévias e confirmação preserva conteúdo', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  await open(page, fixture, '/painel/perfil/modelos')
  for (const name of ['Comunidades e grupos', 'Criadores', 'Lojas', 'Profissionais', 'Eventos']) {
    await page.getByRole('article', { name, exact: true }).getByRole('button', { name: 'Ver modelo', exact: true }).click()
    const preview = page.getByRole('dialog', { name, exact: true })
    await expect(preview).toBeVisible()
    await shot(page, info, '/painel/perfil/modelos', 'previa-' + name, false, true)
    await preview.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(preview.getByLabel('Manter meus grupos e links')).toBeChecked()
    await shot(page, info, '/painel/perfil/modelos', 'confirmacao-' + name, false, true)
    if (name === 'Criadores') {
      await preview.getByLabel('Manter meus grupos e links').uncheck()
      await shot(page, info, '/painel/perfil/modelos', 'confirmacao-substituir-conteudo', false, true)
    }
    await page.keyboard.press('Escape')
  }
})

test('OFP favoritos — coleção, filtros, diálogos e publicação', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const linkId = randomUUID(), collectionId = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${linkId}','${fixture.tenantId}','${fixture.otherId}','https://example.com/ondas-audit','Comunidade de estudos','Materiais e encontros',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  const favorite = await roadmapApi(page, '/me/favorites/' + linkId, 'PUT'); expect(favorite.status).toBe(200)
  const collection = await roadmapApi(page, '/me/collections', 'POST', { id: collectionId, name: 'Leituras da semana' }); expect(collection.status).toBe(200)
  expect(favorite.body.favoriteId).toBeTruthy()
  expect((await roadmapApi(page, '/me/collections/' + collectionId + '/items/' + favorite.body.favoriteId, 'PUT', { expectedVersion: collection.body.collection.version })).status).toBe(200)
  await open(page, fixture, '/painel/favoritos'); await shot(page, info, '/painel/favoritos', 'favoritos-populados')
  await page.getByRole('tab', { name: 'Coleções', exact: true }).click(); await shot(page, info, '/painel/favoritos', 'colecoes-populadas')
  await page.locator('[data-collection-id="' + collectionId + '"]').click(); await ready(page)
  await shot(page, info, '/painel/favoritos', 'colecao-detalhe')
})

test('OFP alias painel/visao preserva o destino real', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  await page.goto(fixture.origin + '/painel/visao'); await expect(page).toHaveURL(fixture.origin + '/painel'); await ready(page)
  await shot(page, info, '/painel/visao', 'redirecionamento-painel')
})


test('OFP recursos derivados — canais, campanhas e apresentação publicados', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture)
  const source = await redirect(page, 'Canal da comunidade'), groupId = randomUUID()
  expect((await roadmapApi(page, '/me/profile/channel-groups/' + groupId, 'PUT', { name: 'Comunidade e encontros', visible: true, expectedVersion: 1, channels: [{ id: randomUUID(), label: 'Abrir comunidade', networkId: null, destinationRevisionId: source.destinationRevision.id, paused: false }] })).status).toBe(200)
  await publishProfile(page); grantProfileCapability(fixture, 'profile.analytics')
  for (const route of ['/painel/perfil/canais', '/painel/perfil/canais/novo', '/painel/perfil/canais/' + groupId]) {
    await open(page, fixture, route); await shot(page, info, route, 'canais-com-destino')
    await selector(page, info, route)
  }
  await readStates(page, fixture, info, { key: 'grupo-canais', path: '/painel/perfil/canais/' + groupId, api: '/me/profile/channel-groups' })
  const sources = await roadmapApi(page, '/me/profile/campaign-sources'); expect(sources.status).toBe(200)
  const revisionId = sources.body.revisions[0].id as string
  const revision = await roadmapApi(page, '/me/profile/campaign-sources/' + revisionId)
  const campaign = await roadmapApi(page, '/me/profile/campaigns', 'POST', { name: 'Encontros da comunidade', slug: fixture.campaignSlug, sourceRevisionId: revisionId, itemSelection: [revision.body.content.items.find((item: { type: string }) => item.type === 'URL').id] })
  expect(campaign.status).toBe(200)
  const campaignId = campaign.body.id as string
  for (const route of ['/painel/perfil/campanhas', '/painel/perfil/campanhas/' + campaignId + '/previa']) {
    await open(page, fixture, route); await shot(page, info, route, 'campanha-rascunho')
  }
  await open(page, fixture, '/painel/perfil/campanhas')
  await dialog(page, info, '/painel/perfil/campanhas', 'Excluir Encontros da comunidade')
  expect((await roadmapApi(page, '/me/profile/campaigns/' + campaignId + '/publish', 'POST', { expectedVersion: campaign.body.version })).status).toBe(200)
  await open(page, fixture, '/painel/perfil/campanhas'); await shot(page, info, '/painel/perfil/campanhas', 'campanha-publicada')
  for (const label of ['Editar Encontros da comunidade', 'Arquivar Encontros da comunidade']) await dialog(page, info, '/painel/perfil/campanhas', label)
  const metrics = '/painel/perfil/campanhas/' + campaignId + '/metricas'
  await open(page, fixture, metrics); await shot(page, info, metrics, 'metricas-sem-visitas')
  await readStates(page, fixture, info, { key: 'campanha-metricas', path: metrics, api: '/me/profile/measurement' })
  const kit = await roadmapApi(page, '/me/profile/media-kit', 'PATCH', { expectedVersion: 0, content: { publicFields: { showBio: true, showPhoto: true, contactIds: [] }, metricSelections: [], manualMetrics: [{ platform: 'INSTAGRAM', value: 12500, asOf: '2026-10-18' }] } })
  expect(kit.status).toBe(200)
  expect((await roadmapApi(page, '/me/profile/media-kit/publish', 'POST', { expectedVersion: kit.body.version })).status).toBe(200)
  for (const route of ['/painel/perfil/midia-kit', '/painel/perfil/midia-kit/previa']) {
    await open(page, fixture, route); await shot(page, info, route, 'apresentacao-publicada')
  }
})

test('OFP equipe — abas, convite, editor, consulta e agência com concessão real', async ({ page, browser }, info) => {
  test.setTimeout(300_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  grantProfileCapability(fixture, 'profile.analytics')
  await open(page, fixture, '/painel/equipe'); await shot(page, info, '/painel/equipe', 'acessos-conta-vazio')
  await page.getByRole('button', { name: 'Convidar colaborador', exact: true }).click()
  await shot(page, info, '/painel/equipe', 'convite-conta-email', false, true)
  await page.getByLabel('E-mail da pessoa', { exact: true }).fill(fixture.other)
  await page.getByRole('button', { name: 'Escolher permissões' }).click()
  await shot(page, info, '/painel/equipe', 'convite-conta-permissoes', false, true)
  await page.getByRole('radio', { name: /Personalizado/ }).check()
  await shot(page, info, '/painel/equipe', 'convite-conta-personalizado', false, true)
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Acessos por página', exact: true }).click()
  await shot(page, info, '/painel/equipe', 'acessos-pagina-vazio')
  const team = page.getByRole('region', { name: 'Equipe e páginas compartilhadas' })
  await team.getByRole('button', { name: 'Convidar colaborador', exact: true }).click()
  await shot(page, info, '/painel/equipe', 'convite-pagina-editar', false, true)
  await page.getByLabel('E-mail de quem vai colaborar').fill(fixture.other)
  await page.getByRole('button', { name: 'Criar convite', exact: true }).click()
  const invitation = await page.getByLabel('Link do convite').inputValue()
  await shot(page, info, '/painel/equipe', 'convite-pagina-criado', false, true)
  await page.getByRole('button', { name: 'Concluir', exact: true }).click()
  await shot(page, info, '/painel/equipe', 'convite-pendente')
  const context = await browser.newContext({ viewport: page.viewportSize()!, locale: 'pt-BR', reducedMotion: 'reduce', isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch) })
  try {
    const editor = await context.newPage(); await login(editor, fixture, true); await editor.goto(invitation)
    await editor.getByRole('button', { name: 'Aceitar convite', exact: true }).click()
    await expect(editor.getByText('Convite aceito.', { exact: true })).toBeVisible()
    await editor.getByRole('link', { name: 'Abrir página compartilhada' }).click(); await ready(editor)
    const profileId = new URL(editor.url()).pathname.split('/')[3]
    for (const section of ['editar', 'previa', 'metricas']) {
      const route = '/painel/equipe/' + profileId + '/' + section
      await open(editor, fixture, route); await shot(editor, info, route, 'concessao-editor')
      await readStates(editor, fixture, info, { key: 'colaborador-' + section, path: route, api: section === 'metricas' ? '/me/profile/measurement' : section === 'previa' ? '/me/profile/preview/items' : '/me/profile' })
    }
    sql(`UPDATE profile_memberships SET role='VIEWER',version=version+1 WHERE "tenantId"='${fixture.tenantId}' AND "profileId"='${profileId}' AND "userId"='${fixture.otherId}'`)
    await open(editor, fixture, '/painel/equipe/' + profileId + '/editar')
    await shot(editor, info, '/painel/equipe/' + profileId + '/editar', 'concessao-consulta')
    await open(editor, fixture, '/painel/clientes')
    await editor.getByRole('button', { name: 'Adicionar página', exact: true }).click()
    await shot(editor, info, '/painel/clientes', 'adicionar-com-escolha-autorizada', false, true)
    const add = editor.getByRole('dialog', { name: 'Adicionar página', exact: true })
    await selectOption(add.getByLabel('Página com acesso autorizado'), profileId)
    await add.getByLabel('Nome para identificar a página').fill('Comunidade de estudos')
    await add.getByRole('button', { name: 'Adicionar à minha lista' }).click(); await expect(add).toHaveCount(0)
    await shot(editor, info, '/painel/clientes', 'portfolio-populado')
    await dialog(editor, info, '/painel/clientes', 'Remover da minha lista')
    await open(page, fixture, '/painel/equipe'); await page.getByRole('tab', { name: 'Acessos por página', exact: true }).click()
    await shot(page, info, '/painel/equipe', 'colaborador-ativo')
    await dialog(page, info, '/painel/equipe', 'Revogar acesso')
    await page.getByRole('button', { name: 'Revogar acesso', exact: true }).click()
    await page.getByRole('dialog', { name: 'Revogar acesso', exact: true }).getByRole('button', { name: 'Confirmar revogação', exact: true }).click()
    await expect(page.getByText('Acesso revogado.', { exact: true })).toBeVisible()
    await shot(page, info, '/painel/equipe', 'concessao-revogada')
    for (const section of ['editar', 'previa', 'metricas']) {
      const route = '/painel/equipe/' + profileId + '/' + section
      await open(editor, fixture, route)
      await expect(editor.getByRole('alert').first()).toBeVisible()
      await shot(editor, info, route, 'concessao-encerrada')
    }
  } finally { await context.close() }
  await readStates(page, fixture, info, { key: 'equipe-conta', path: '/painel/equipe', api: '/team' })
})

test('OFP distribuição — vazia, configuração, ativa e erro', async ({ page }, info) => {
  test.setTimeout(180_000)
  const fixture = isolatedFixture(); await login(page, fixture)
  const base = await redirect(page, 'Entrada da comunidade'), option = await redirect(page, 'Grupo de estudos')
  const route = '/painel/convites/' + base.id + '/distribuicao'
  await open(page, fixture, route); await shot(page, info, route, 'sem-distribuicao')
  await page.goto(fixture.origin + route + '?configurar=1')
  await expect(page.getByRole('dialog')).toBeVisible(); await shot(page, info, route, 'configuracao', false, true)
  await page.keyboard.press('Escape')
  const pool = await roadmapApi(page, '/me/redirects/' + base.id + '/pool')
  expect((await roadmapApi(page, '/me/redirects/' + base.id + '/pool', 'PUT', { expectedVersion: pool.body.version, destinations: [{ revisionId: option.destinationRevision.id, weight: 1, paused: false }] })).status).toBe(200)
  await open(page, fixture, route); await shot(page, info, route, 'distribuicao-ativa')
  await page.getByRole('button', { name: 'Pausar destino', exact: true }).click()
  await expect(page.getByText('Nenhum link permanente disponível. Retome um destino ou ajuste a configuração para voltar a encaminhar visitantes.', { exact: true })).toBeVisible()
  await shot(page, info, route, 'destino-pausado-sem-elegivel')
  await page.getByRole('button', { name: 'Retomar destino', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pausar destino', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Usar um só destino', exact: true }).click()
  await shot(page, info, route, 'confirmar-destino-unico', false, true)
  await page.getByRole('button', { name: 'Confirmar destino único', exact: true }).click()
  await expect(page.getByText('Distribuição desativada. O endereço voltou ao link permanente único.', { exact: true })).toBeVisible()
  await shot(page, info, route, 'destino-unico-restaurado')
  await readStates(page, fixture, info, { key: 'distribuicao', path: route, api: '/me/redirects/' + base.id + '/pool' })
})

test('OFP denúncia — formulário, seleção e erro conservam comentário', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const linkId = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${linkId}','${fixture.tenantId}','${fixture.otherId}','https://example.com/ondas-report','Comunidade de estudos','Materiais e encontros',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  const route = '/painel/denunciar/' + linkId
  await open(page, fixture, route); await shot(page, info, route, 'formulario')
  await selector(page, info, route)
  await selectOption(page.getByLabel('Motivo', { exact: true }), 'EXPIRED_INVITE')
  await page.getByLabel('Comentário (opcional)', { exact: true }).fill('O convite informa que expirou.')
  let release = () => {}, received = () => {}
  const gate = new Promise<void>(resolve => { release = resolve }), requestSeen = new Promise<void>(resolve => { received = resolve })
  const endpoint = new RegExp('/bff/v1/links/' + linkId + '/reports$')
  await page.route(endpoint, async request => { received(); await gate; await request.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Não foi possível enviar. Seu texto foi mantido.' }) }) })
  try {
    await page.getByRole('button', { name: 'Enviar denúncia', exact: true }).click()
    await requestSeen
    await expect(page.getByLabel('Comentário (opcional)', { exact: true })).toBeDisabled()
    await shot(page, info, route, 'envio-pendente', true)
  } finally { release() }
  await expect(page.getByRole('main').getByRole('alert').filter({ hasText: 'Não foi possível enviar. Seu texto foi mantido.' })).toBeVisible()
  await expect(page.getByLabel('Comentário (opcional)', { exact: true })).toHaveValue('O convite informa que expirou.')
  await shot(page, info, route, 'erro-conserva-comentario', true)
  await page.unroute(endpoint)
  await page.getByRole('button', { name: 'Enviar denúncia', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Denúncia registrada', exact: true })).toBeFocused()
  await shot(page, info, route, 'denuncia-registrada')
  await readStates(page, fixture, info, { key: 'denuncia', path: route, api: '/links/' + linkId })
})


test('OFP idiomas — apresentação, grupos, botões e remoção', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/idiomas'; await open(page, fixture, route)
  await page.getByRole('button', { name: 'Adicionar tradução', exact: true }).click()
  await page.getByLabel('Nome traduzido da página', { exact: true }).fill('Anna projects')
  await shot(page, info, route, 'traducao-apresentacao')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome traduzido do grupo', { exact: true }).fill('Projects')
  await shot(page, info, route, 'traducao-grupos')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Texto traduzido do botão', { exact: true }).fill('Visit project')
  await shot(page, info, route, 'traducao-botoes')
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await expect(page).toHaveURL(fixture.origin + '/painel/perfil')
  await open(page, fixture, route); await shot(page, info, route, 'traducao-salva')
  await page.getByRole('button', { name: 'Remover idioma', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Remover tradução', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-remocao-traducao', false, true)
})

test('OFP importação — linhas inválidas, revisão, filtro e edição', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/importar'; await open(page, fixture, route)
  await page.getByRole('textbox', { name: 'Endereços dos links' }).fill(['https://example.com/f17-um', 'javascript:alert(1)', 'https://example.com/f17-um'].join('\n'))
  await page.getByRole('button', { name: 'Revisar links', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Linha 2', exact: true }).getByText('Endereço inválido', { exact: true })).toBeVisible()
  await shot(page, info, route, 'revisao-erros-repetidos')
  await selectOption(page.getByLabel('Situação do endereço'), 'INVALID')
  await shot(page, info, route, 'filtro-invalido')
  await selectOption(page.getByLabel('Situação do endereço'), '')
  await page.getByRole('button', { name: 'Editar linha 1', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Revisar linha 1', exact: true })).toBeVisible()
  await shot(page, info, route, 'editar-linha', false, true)
  await page.keyboard.press('Escape')
})

test('OFP backup — arquivo inválido e confirmação de importação', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/exportar'; await open(page, fixture, route)
  const file = page.getByLabel('Arquivo da página', { exact: true })
  await file.setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') })
  await expect(page.getByRole('alert').first()).toBeVisible()
  await shot(page, info, route, 'arquivo-invalido')
  const backup = await roadmapApi(page, '/me/profile/export?revision=draft'); expect(backup.status).toBe(200)
  await file.setInputFiles({ name: 'pagina-sintetica.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup.body)) })
  await expect(page.getByRole('dialog', { name: 'Importar página', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-importacao', false, true)
  await page.keyboard.press('Escape')
})

test('OFP histórico — diferenças e confirmação de restauração', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); const content = await saveProfile(page, fixture); await publishProfile(page)
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 1, content: { ...content, name: 'Comunidade atualizada' } })).status).toBe(200)
  await publishProfile(page)
  const route = '/painel/perfil/historico'; await open(page, fixture, route)
  await shot(page, info, route, 'duas-versoes')
  await page.getByRole('article', { name: 'Versão 1', exact: true }).getByRole('button', { name: 'Ver diferenças', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, route, 'comparacao', false, true)
  await page.keyboard.press('Escape')
})


async function presentationGet(page: Page, api: string, body: unknown) {
  await page.route(url => url.pathname === '/bff/v1' + api, async route => {
    if (route.request().method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    else await route.continue()
  })
}

test('OFP avançado editor — salvando, erro, conflito, menu e confirmações', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/dados'; await open(page, fixture, route)
  let release = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  const apiPath = (url: URL) => url.pathname === '/bff/v1/me/profile'
  await page.route(apiPath, async request => { if (request.request().method() === 'PATCH') { await gate; await request.continue() } else await request.continue() })
  try {
    await page.getByLabel('Nome da página', { exact: true }).fill('Ana e a comunidade')
    await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'saving')
    await shot(page, info, route, 'salvando', true)
  } finally { release(); await page.unrouteAll({ behavior: 'wait' }) }
  await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'saved')
  await shot(page, info, route, 'salvo-alteracoes-nao-publicadas')
  await page.route(apiPath, async request => request.request().method() === 'PATCH' ? request.abort('failed') : request.continue())
  await page.getByLabel('Nome da página', { exact: true }).fill('Alteração conservada na aba')
  await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'error')
  await shot(page, info, route, 'erro-de-salvamento', true)
  await page.unrouteAll({ behavior: 'wait' }); await open(page, fixture, route)
  await page.route(apiPath, async request => request.request().method() === 'PATCH' ? request.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'O perfil mudou em outra aba. Recarregue antes de continuar.' }) }) : request.continue())
  await page.getByLabel('Nome da página', { exact: true }).fill('Conflito conservado na aba')
  await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'error')
  await shot(page, info, route, 'conflito-de-versao', true)
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Recarregar perfil', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-recarregamento', true)
  await page.unrouteAll({ behavior: 'wait' }); await open(page, fixture, '/painel/perfil')
  await page.getByLabel('Mais opções da página', { exact: true }).click()
  await shot(page, info, '/painel/perfil', 'menu-completo', false, true)
  await captureDialogRemainder(page, info, '/painel/perfil', 'menu-completo', { dialog: page.locator('[data-profile-menu-content]'), source: 'live' })
  await page.getByRole('button', { name: 'Retirar do ar', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Retirar perfil', exact: true })).toBeVisible()
  await shot(page, info, '/painel/perfil', 'confirmar-retirada')
  await page.getByRole('button', { name: 'Cancelar retirada', exact: true }).click()
  await page.getByRole('button', { name: 'QR Code', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, '/painel/perfil', 'qr-pronto', false, true)
})

test('OFP avançado conteúdo — texto, imagem, vídeo e remoção', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); grantRichBlocks(fixture)
  const route = '/painel/perfil/conteudo'; await open(page, fixture, route)
  for (const kind of ['TEXT', 'IMAGE', 'VIDEO']) {
    await selectOption(page.getByLabel('Adicionar bloco', { exact: true }), kind)
    await page.getByRole('button', { name: 'Adicionar bloco', exact: true }).click()
    const editor = page.getByRole('dialog'); await expect(editor).toBeVisible()
    await shot(page, info, route, 'bloco-' + kind, false, true)
    await editor.getByLabel('Título', { exact: true }).fill(kind === 'TEXT' ? 'Sobre a comunidade' : kind === 'IMAGE' ? 'Nosso encontro' : 'Apresentação da comunidade')
    if (kind === 'TEXT') await editor.getByLabel('Texto', { exact: true }).fill('Compartilhamos referências, descobertas e projetos de quem participa.')
    if (kind === 'VIDEO') await editor.getByLabel('Endereço do vídeo', { exact: true }).fill('https://www.youtube.com/watch?v=jfKfPfyJRdk')
    if (kind === 'IMAGE') {
      const uploaded = page.waitForResponse(response => response.url().endsWith('/me/profile/avatar') && response.request().method() === 'POST')
      await editor.getByLabel('Imagem', { exact: true }).setInputFiles({ name: 'reading.jpg', mimeType: 'image/jpeg', buffer: readFileSync(path.join(__dirname, 'fixtures/home-preview/reading.jpg')) })
      expect((await uploaded).status()).toBe(200)
      await editor.getByLabel('Descrição da imagem', { exact: true }).fill('Livros e materiais compartilhados pela comunidade')
    }
    await editor.getByRole('button', { name: 'Salvar bloco', exact: true }).click()
    await expect(editor).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Editor do perfil', exact: true })).toHaveAttribute('data-save-state', 'saved')
  }
  await shot(page, info, route, 'tres-tipos-de-conteudo')
  await page.getByRole('button', { name: 'Remover Sobre a comunidade', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Confirmar remoção', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-remocao-bloco')
})

test('OFP avançado diagnóstico — recomendações e descarte persistido', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); const content = await saveProfile(page, fixture)
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 1, content: { ...content, items: [...content.items, { ...content.items[0], id: randomUUID(), destination: 'https://example.com/outro' }] } })).status).toBe(200)
  const route = '/painel/perfil/diagnostico'; await open(page, fixture, route)
  const finding = page.getByRole('article').filter({ hasText: 'Títulos repetidos' })
  await expect(finding).toBeVisible(); await shot(page, info, route, 'recomendacao-detalhada')
  await finding.getByRole('button', { name: 'Ignorar sugestão', exact: true }).click()
  await expect(finding).toHaveCount(0); await shot(page, info, route, 'recomendacao-descartada')
})


test('OFP avançado contatos — atendimento, notas, histórico e exclusão', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture)
  const rows: ContactSubmission[] = ['NEW', 'IN_PROGRESS', 'DONE'].map((status, index) => ({ id: randomUUID(), answers: { name: ['Ana visitante', 'Bruno visitante', 'Carla visitante'][index], email: 'visita' + index + '@fixture.test', message: 'Gostaria de saber mais sobre os encontros da comunidade.' }, marketingOptIn: false, createdAt: '2026-10-23T12:00:00Z', expiresAt: '2026-11-23T12:00:00Z', status: status as ContactSubmission['status'], version: 1, sourceSlug: 'comunidade-ondas', firstHandledAt: index ? '2026-10-23T13:00:00Z' : null }))
  const settings: ContactSettings = { version: 1, definition: { enabled: true, purpose: 'contact', marketingAllowed: false, fields: [{ key: 'name', required: false }, { key: 'email', required: true }, { key: 'message', required: false }] } }
  await presentationGet(page, '/me/forms', settings)
  await presentationGet(page, '/me/forms/submissions', { items: rows, nextCursor: null })
  const detail: ContactDetail = { ...rows[0], notes: Array.from({ length: 7 }, (_, index) => ({ id: randomUUID(), text: 'Nota de atendimento ' + (index + 1), actorId: fixture.ownerId, createdAt: '2026-10-23T13:00:00Z', updatedAt: '2026-10-23T13:00:00Z' })), history: Array.from({ length: 7 }, (_, index) => ({ version: index + 1, kind: 'status.changed', actorId: fixture.ownerId, fromStatus: 'NEW', toStatus: 'IN_PROGRESS', noteId: null, createdAt: '2026-10-23T13:00:00Z' })), nextHistoryCursor: null }
  await presentationGet(page, '/me/forms/submissions/' + rows[0].id, detail)
  const route = '/painel/perfil/contatos'; await open(page, fixture, route)
  await shot(page, info, route, 'tres-situacoes-de-contato', true)
  await page.getByRole('button', { name: 'Atender', exact: true }).first().click()
  const handling = page.getByRole('dialog'); await expect(handling.getByLabel('Situação do atendimento')).toBeEnabled()
  await shot(page, info, route, 'atendimento', true, true)
  async function contactTab(label: string) {
    const tab = handling.getByRole('tab', { name: label, exact: true })
    if (await tab.isVisible()) await tab.click()
    else await selectOption(handling.getByRole('combobox', { name: 'Detalhes do contato', exact: true }), { label })
  }
  for (const tab of ['Notas privadas', 'Histórico']) {
    await contactTab(tab)
    await shot(page, info, route, 'contato-' + tab, true, true)
    await handling.getByRole('button', { name: 'Próxima', exact: true }).click()
    await shot(page, info, route, 'contato-' + tab + '-pagina2', true, true)
  }
  await contactTab('Notas privadas')
  await handling.getByRole('button', { name: 'Nova nota', exact: true }).click()
  await handling.getByLabel('Nota privada', { exact: true }).fill('Retornar com os horários dos encontros.')
  await shot(page, info, route, 'nota-privada-em-edicao', true, true)
  await handling.getByRole('button', { name: 'Voltar às notas', exact: true }).click()
  await handling.getByRole('button', { name: 'Remover nota', exact: true }).first().click()
  await expect(handling.getByRole('button', { name: 'Confirmar remoção', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-remocao-nota', true, true)
  await page.keyboard.press('Escape')
  await dialog(page, info, route, 'Excluir contato', true)
})

test('OFP avançado integrações — entregas, etapas e confirmações', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture)
  const endpointId = randomUUID()
  const state = { configured: true, endpoints: [{ id: endpointId, url: 'https://example.com/fixture-webhook', eventTypes: ['contact.received', 'link.approved', 'campaign.ended'], enabled: true, version: 1 }], deliveries: ['PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'CANCELLED'].map((status, index) => ({ id: randomUUID(), eventId: 'evento-local-' + index, endpointId, type: 'contact.received', status, attempts: index > 1 ? 2 : 0, budget: 5, createdAt: '2026-10-23T12:00:00Z', nextAttemptAt: '2026-10-24T12:00:00Z', statusCode: status === 'DELIVERED' ? 200 : status === 'FAILED' ? 503 : null, errorCode: status === 'FAILED' ? 'HTTP_ERROR' : null })) }
  await presentationGet(page, '/me/integrations/endpoints', state)
  const route = '/painel/integracoes'; await open(page, fixture, route); await shot(page, info, route, 'conexao-configurada', true)
  await dialog(page, info, route, 'Editar', true)
  await page.locator('summary').filter({ hasText: 'Mais opções' }).click()
  const integrationMenu = page.locator('details[open] > div').filter({ has: page.getByRole('button', { name: 'Remover', exact: true }) })
  await integrationMenu.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await shot(page, info, route, 'integracao-mais-opcoes', true, true)
  await captureDialogRemainder(page, info, route, 'integracao-mais-opcoes', { dialog: integrationMenu, source: 'presentation-fixture' })
  for (const label of ['Renovar chave', 'Remover']) await dialog(page, info, route, label, true)
  await page.getByRole('button', { name: 'Nova integração', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Nova integração', exact: true })
  await editor.getByLabel('Endereço que receberá os avisos').fill('https://example.com/fixture-webhook')
  await shot(page, info, route, 'integracao-endereco', true, true)
  await editor.getByRole('button', { name: 'Continuar', exact: true }).click(); await shot(page, info, route, 'integracao-avisos', true, true)
  await editor.getByRole('button', { name: 'Continuar', exact: true }).click(); await shot(page, info, route, 'integracao-conferir', true, true)
  await page.route(url => url.pathname === '/bff/v1/me/integrations/endpoints', async request => {
    if (request.request().method() === 'POST') await request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ secret: 'visual-fixture-only-not-a-real-secret' }) })
    else await request.fallback()
  })
  await editor.getByRole('button', { name: 'Salvar integração', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Guarde a chave de assinatura', exact: true })).toBeVisible()
  await shot(page, info, route, 'chave-criada', true, true)
  await page.getByRole('button', { name: 'Já guardei', exact: true }).click()
  const tab = page.getByRole('tab', { name: 'Entregas dos avisos', exact: true })
  if (await tab.isVisible()) await tab.click(); else await selectOption(page.getByRole('combobox', { name: 'Área das integrações', exact: true }), 'deliveries')
  await shot(page, info, route, 'entregas-todas-as-situacoes', true)
  await selectOption(page.getByLabel('Situação da entrega', { exact: true }), 'FAILED')
  await shot(page, info, route, 'entregas-falhas', true)
})

test('OFP avançado recursos pessoais — categorias e preferências de lembretes', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const followed = await roadmapApi(page, '/me/followed-niches'); expect(followed.status).toBe(200)
  const niche = followed.body.niches[0]; expect(niche.id).toBeTruthy()
  expect((await roadmapApi(page, '/me/followed-niches/' + niche.id, 'PUT')).status).toBe(200)
  await open(page, fixture, '/painel/interesses'); await shot(page, info, '/painel/interesses', 'categoria-seguida')
  await page.getByRole('button', { name: 'Ativar resumos', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Resumo por e-mail', exact: true })).toBeVisible()
  await shot(page, info, '/painel/interesses', 'preferencias-resumo', false, true)
  await page.keyboard.press('Escape')
  const reminderId = randomUUID()
  const reminders: RenewalRemindersData = { preferences: { emailRenewal: false, expectedVersion: 0 }, reminders: [{ promotionId: reminderId, link: { id: randomUUID(), name: 'Comunidade de estudos' }, surface: 'HOME', expiresAt: '2026-10-26T18:00:00Z', status: 'ACTIVE', renewPath: '/painel/links/fixture/destaque', resultPath: '/painel/links/fixture/resultado', summary: { from: '2026-10-20', to: '2026-10-23', impressions: 180, clicks: 12, dataState: 'RECORDED', coverage: 'COMPLETE' } }] }
  await presentationGet(page, '/promotions/mine/reminders', reminders)
  await open(page, fixture, '/painel/lembretes'); await shot(page, info, '/painel/lembretes', 'destaque-proximo-do-vencimento', true)
  await dialog(page, info, '/painel/lembretes', 'Configurar avisos', true)
})


test('OFP avançado agência — solicitações e decisões de acesso', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const profileId = sql(`SELECT id FROM profiles WHERE "tenantId"='${fixture.tenantId}' AND "ownerId"='${fixture.ownerId}'`)
  const state = { personal: true, clients: [{ id: randomUUID(), name: 'Comunidade de estudos', pageName: 'Ana Ondas' }], colleagues: [{ id: fixture.otherId, name: 'Colaboradora Ondas' }], requests: ['PENDING', 'APPROVED', 'DECLINED', 'REVOKED', 'EXPIRED'].map((status, index) => ({ id: randomUUID(), version: 1, role: 'VIEWER', status, page: { name: 'Comunidade de estudos', slug: fixture.profileSlug }, userName: 'Colaboradora Ondas', incoming: index === 0, expiresAt: '2026-10-30T12:00:00Z' })) }
  expect(profileId).toBeTruthy()
  await presentationGet(page, '/me/agency/access', state)
  const route = '/painel/clientes/acessos'; await open(page, fixture, route)
  await shot(page, info, route, 'pedido-pendente-recebido', true)
  for (const label of ['Aprovar acesso', 'Recusar acesso', 'Solicitar acesso para a equipe']) await dialog(page, info, route, label, true)
  await selectOption(page.getByLabel('Situação do pedido', { exact: true }), 'ALL')
  await shot(page, info, route, 'pedidos-todas-situacoes', true)
})

test('OFP avançado agência — transferência em duas etapas e decisões', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const current = await roadmapApi(page, '/me/agency/transfers'); expect(current.status).toBe(200)
  const state = { ...current.body, requests: ['PENDING', 'PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].map((status, index) => ({ id: randomUUID(), profileId: current.body.page.id, pageName: 'Comunidade de estudos', pageSlug: fixture.profileSlug, version: 1, profileVersion: 1, status, expiresAt: '2026-10-30T12:00:00Z', incoming: index !== 1 })) }
  await presentationGet(page, '/me/agency/transfers', state)
  const route = '/painel/clientes/transferencias'; await open(page, fixture, route)
  await page.getByRole('button', { name: 'Transferir minha página', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Transferir minha página', exact: true })
  await form.getByLabel('E-mail do novo titular', { exact: true }).fill(fixture.other)
  await shot(page, info, route, 'transferir-destinatario', true, true)
  await form.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(form.getByRole('button', { name: 'Solicitar transferência', exact: true })).toBeDisabled()
  await shot(page, info, route, 'conferir-sem-consentimento', true, true)
  await form.getByRole('checkbox').check(); await shot(page, info, route, 'conferir-com-consentimento', true, true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Receber página', exact: true })).toBeDisabled()
  await shot(page, info, route, 'receber-indisponivel-com-pagina-propria', true)
  for (const label of ['Recusar transferência', 'Cancelar pedido']) await dialog(page, info, route, label, true)
  await selectOption(page.getByLabel('Situação', { exact: true }), 'ALL'); await shot(page, info, route, 'transferencias-todas-situacoes', true)
  await presentationGet(page, '/me/agency/transfers', { ...state, page: null })
  await open(page, fixture, route); await dialog(page, info, route, 'Receber página', true)
})

test('OFP avançado endereço — reserva, HTTPS pendente, ativo e desativação', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const state: ProfileHostState = { hosts: [{ hostname: 'ana.links.fixture.test', status: 'ACTIVE', tlsVerifiedAt: '2026-10-23T12:00:00Z', version: 1 }, { hostname: 'estudos.links.fixture.test', status: 'PENDING', tlsVerifiedAt: null, version: 1 }, { hostname: 'antigo.links.fixture.test', status: 'DISABLED', tlsVerifiedAt: null, version: 2 }], version: 3, bases: ['links.fixture.test'], allowed: true, published: true, hasPage: true }
  await presentationGet(page, '/me/profile/hosts', state)
  const route = '/painel/perfil/endereco'; await open(page, fixture, route); await shot(page, info, route, 'enderecos-ativo-pendente-desativado', true)
  await shot(page, info, route, 'historico-enderecos-fechado', true)
  await page.locator('summary').filter({ hasText: 'Endereços anteriores' }).click()
  await shot(page, info, route, 'historico-enderecos-aberto', true)
  await dialog(page, info, route, 'Escolher outro endereço', true)
  await dialog(page, info, route, 'Desativar', true)
})

test('OFP avançado assistente — entrada, revisão seletiva, prévia e aplicação', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/assistente'; await open(page, fixture, route)
  await page.getByLabel('O que você faz?', { exact: true }).fill('Projetos da comunidade')
  await page.getByLabel('O que mais quer contar?', { exact: true }).fill('Encontros para compartilhar materiais de estudo')
  await shot(page, info, route, 'assistente-atividade')
  await page.getByRole('button', { name: 'Escolher links', exact: true }).click()
  await page.getByLabel('Links para incluir', { exact: true }).fill('https://example.com/new-project')
  await shot(page, info, route, 'assistente-links')
  await page.getByRole('button', { name: 'Gerar sugestões', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Escolha o que quer aplicar', exact: true })).toBeVisible()
  await shot(page, info, route, 'assistente-revisao')
  await page.getByLabel('Grupos e novos links', { exact: true }).uncheck()
  await page.getByLabel('Ordem dos botões', { exact: true }).uncheck()
  await page.getByLabel('Aparência do modelo', { exact: true }).uncheck()
  await page.getByLabel('Descrição sugerida').fill('Materiais e encontros para aprender em comunidade.')
  await expect(page.getByRole('button', { name: 'Aplicar ao rascunho', exact: true })).toBeDisabled()
  await shot(page, info, route, 'assistente-previa-desatualizada')
  await page.getByRole('button', { name: 'Atualizar prévia', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Aplicar ao rascunho', exact: true })).toBeEnabled()
  await shot(page, info, route, 'assistente-previa-atualizada')
  await page.getByRole('button', { name: 'Aplicar ao rascunho', exact: true }).click()
  await expect(page.getByText('Sugestões aplicadas ao rascunho. Sua página publicada não foi alterada.', { exact: true })).toBeVisible()
  await shot(page, info, route, 'assistente-aplicada')
  const available = await roadmapApi(page, '/me/profile/suggestions'); expect(available.status).toBe(200)
  await presentationGet(page, '/me/profile/suggestions', { ...available.body, available: false })
  await open(page, fixture, route); await shot(page, info, route, 'assistente-indisponivel', true)
  await presentationGet(page, '/me/profile/suggestions', { ...available.body, available: true, quota: { ...available.body.quota, remaining: 0, used: available.body.quota.limit } })
  await open(page, fixture, route)
  await page.getByLabel('O que você faz?', { exact: true }).fill('Comunidade de leitura')
  await page.getByRole('button', { name: 'Escolher links', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Gerar sugestões', exact: true })).toBeDisabled()
  await shot(page, info, route, 'limite-diario-alcancado', true)
})

test('OFP avançado checklist — pendente, pronto, publicado e link inválido', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const route = '/painel/perfil/checklist'; await open(page, fixture, route); await shot(page, info, route, 'checklist-sem-pagina')
  const content = await saveProfile(page, fixture)
  await open(page, fixture, route); await shot(page, info, route, 'checklist-pronto-publicar')
  await page.getByRole('button', { name: 'Publicar página', exact: true }).click()
  await expect(page.getByText('Publicação concluída.', { exact: true })).toBeVisible(); await shot(page, info, route, 'checklist-publicado')
  const current = await roadmapApi(page, '/me/profile')
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: current.body.draft.version, content: { ...content, items: [{ ...content.items[0], destination: 'http://example.com/invalid' }] } })).status).toBe(200)
  await open(page, fixture, route)
  await expect(page.getByRole('button', { name: 'Publicar página', exact: true })).toBeDisabled(); await shot(page, info, route, 'checklist-publicacao-bloqueada')
})


test('OFP avançado controles — cores abertas, validação e tipos de link', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); grantProfileScheduling(fixture)
  const appearance = '/painel/perfil/aparencia'; await open(page, fixture, appearance)
  await page.getByRole('tab', { name: 'Cores', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Cor do fundo' }).click()
  await page.getByRole('textbox', { name: 'Cor do fundo — código hexadecimal', exact: true }).evaluate(element => element.scrollIntoView({ block: 'center' }))
  await shot(page, info, appearance, 'colorpicker-aberto', false, true)
  await page.getByRole('textbox', { name: 'Cor do fundo — código hexadecimal', exact: true }).fill('#XX')
  await expect(page.getByRole('alert').filter({ hasText: 'Use # e seis' })).toBeVisible()
  await page.getByRole('alert').filter({ hasText: 'Use # e seis' }).evaluate(element => element.scrollIntoView({ block: 'center' }))
  await shot(page, info, appearance, 'colorpicker-codigo-invalido', false, true)
  await open(page, fixture, '/painel/perfil/links')
  await firstGroup(page)
  await page.getByRole('button', { name: 'Adicionar link', exact: true }).click()
  const editor = page.getByRole('dialog')
  await editor.getByRole('tab', { name: 'Meus links', exact: true }).click()
  await shot(page, info, '/painel/perfil/links', 'link-do-catalogo-vazio', false, true)
  await editor.getByRole('tab', { name: 'Evento', exact: true }).click()
  await shot(page, info, '/painel/perfil/links', 'evento-em-edicao', false, true)
  await editor.getByRole('tab', { name: 'Link permanente', exact: true }).click()
  await shot(page, info, '/painel/perfil/links', 'link-permanente-em-edicao', false, true)
  await page.keyboard.press('Escape')
})

test('OFP avançado coleções — nome, edição, exclusão e publicação', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const id = randomUUID(); expect((await roadmapApi(page, '/me/collections', 'POST', { id, name: 'Referências da comunidade' })).status).toBe(200)
  const route = '/painel/favoritos'; await open(page, fixture, route)
  await page.getByRole('tab', { name: 'Coleções', exact: true }).click()
  await page.locator('[data-new-collection]').click(); await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, info, route, 'nova-colecao', false, true); await page.keyboard.press('Escape')
  await page.locator('[data-collection-id="' + id + '"]').click(); await ready(page)
  await shot(page, info, route, 'colecao-sem-itens')
  await dialog(page, info, route, 'Editar')
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Confirmar exclusão', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-exclusao-colecao')
  await page.getByRole('group', { name: 'Confirmar exclusão', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click()
  await dialog(page, info, route, 'Publicar coleção')
})

test('OFP avançado links permanentes — detalhe, histórico e desativação', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const item = await redirect(page, 'Comunidade e encontros')
  const route = '/painel/convites'; await open(page, fixture, route)
  await page.locator('[data-redirect-id="' + item.id + '"]').click()
  await expect(page.getByRole('heading', { name: 'Comunidade e encontros', level: 2, exact: true })).toBeVisible()
  await shot(page, info, route, 'endereco-detalhe')
  await dialog(page, info, route, 'Alterar destino')
  await page.getByRole('tab', { name: 'Histórico e acessos', exact: true }).click()
  await shot(page, info, route, 'historico-e-acessos')
  await calendar(page, info, route, 'De')
  await page.getByRole('tab', { name: 'Endereço', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Gerenciar endereço' }).click()
  await page.getByRole('button', { name: 'Desativar endereço', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Confirmar desativação', exact: true })).toBeVisible()
  await shot(page, info, route, 'confirmar-desativacao')
})

test('OFP avançado distribuição — divisão e conferência antes de ativar', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const base = await redirect(page, 'Entrada da comunidade'), target = await redirect(page, 'Grupo de estudos')
  const route = '/painel/convites/' + base.id + '/distribuicao'
  await page.goto(fixture.origin + route + '?configurar=1')
  const form = page.getByRole('dialog', { name: 'Configurar distribuição', exact: true })
  await expect(form).toBeVisible()
  await selectOption(form.getByLabel('Qual destino receberá visitas?', { exact: true }), target.destinationRevision.id)
  await form.getByRole('button', { name: 'Incluir destino', exact: true }).click()
  await shot(page, info, route, 'destino-incluido', false, true)
  await form.getByRole('button', { name: 'Definir divisão', exact: true }).click()
  await shot(page, info, route, 'dividir-visitas', false, true)
  await form.getByRole('button', { name: 'Conferir distribuição', exact: true }).click()
  await shot(page, info, route, 'conferir-ativacao', false, true)
  await page.keyboard.press('Escape')
})

test('OFP avançado equipe — convite granular, resumo e link gerado', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture)
  const route = '/painel/equipe'; await open(page, fixture, route)
  await page.getByRole('button', { name: 'Convidar colaborador', exact: true }).click()
  await page.getByLabel('E-mail da pessoa', { exact: true }).fill(fixture.other)
  await page.getByRole('button', { name: 'Escolher permissões', exact: true }).click()
  await page.getByRole('radio', { name: /Personalizado/ }).check()
  await page.getByLabel('Escrever Minha página', { exact: true }).check()
  await page.getByLabel('Ler Campanhas', { exact: true }).check()
  await shot(page, info, route, 'permissoes-granulares', false, true)
  await page.getByRole('button', { name: 'Revisar acesso', exact: true }).click()
  await shot(page, info, route, 'resumo-convite-conta', false, true)
  await page.getByRole('button', { name: 'Criar convite', exact: true }).click()
  await expect(page.getByLabel('Link do convite', { exact: true })).toHaveValue(/scope=workspace&token=/)
  await shot(page, info, route, 'convite-conta-criado', false, true)
  await page.getByRole('button', { name: 'Concluir', exact: true }).click()
  await shot(page, info, route, 'convite-conta-pendente')
})

test('OFP avançado comparação — configuração, publicação e execução', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page); grantProfileCapability(fixture, 'profile.analytics')
  const pref = await roadmapApi(page, '/me/profile/measurement'); expect(pref.status).toBe(200)
  expect((await roadmapApi(page, '/me/profile/measurement', 'PATCH', { enabled: true, expectedVersion: pref.body.version })).status).toBe(200)
  const route = '/painel/perfil/testes'; await open(page, fixture, route)
  await page.getByRole('button', { name: 'Comparar um botão', exact: true }).click()
  await shot(page, info, route, 'comparacao-textos')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await shot(page, info, route, 'comparacao-periodo')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await shot(page, info, route, 'comparacao-revisao')
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Comparação configurada', exact: true })).toBeVisible()
  await shot(page, info, route, 'comparacao-configurada-nao-publicada')
  await publishProfile(page); await open(page, fixture, route)
  await page.getByRole('button', { name: 'Iniciar comparação', exact: true }).click()
  await expect(page.getByText('Em comparação', { exact: true })).toBeVisible()
  await shot(page, info, route, 'comparacao-em-execucao')
  await dialog(page, info, route, 'Interromper teste')
  const current = await roadmapApi(page, '/me/profile/button-tests'); expect(current.status).toBe(200)
  const experiment = current.body.experiments[0]; expect(experiment).toBeTruthy()
  const variants = [
    { ...experiment, id: randomUUID(), status: 'COMPLETE', counts: [{ exposures: 1200, clicks: 60 }, { exposures: 1200, clicks: 120 }], result: { status: 'COMPLETE', winner: 1, rates: [0.05, 0.1], method: 'Comparação de duas proporções com intervalo de confiança de 95%.' } },
    { ...experiment, id: randomUUID(), status: 'STOPPED', counts: [{ exposures: 40, clicks: 2 }, { exposures: 38, clicks: 3 }], result: { status: 'INCONCLUSIVE', winner: null, rates: [0.05, 3 / 38], method: 'Amostra abaixo do mínimo definido por versão.' } },
    { ...experiment, id: randomUUID(), status: 'COMPLETE', counts: [{ exposures: null, clicks: null }, { exposures: null, clicks: null }], result: { status: 'UNAVAILABLE', winner: null, rates: [null, null], method: 'Relatório indisponível para o acesso atual.' } },
  ]
  await presentationGet(page, '/me/profile/button-tests', { ...current.body, experiments: variants })
  await open(page, fixture, route); await shot(page, info, route, 'resultados-conclusivo-inconclusivo-indisponivel', true)
})

test('OFP avançado divulgação — formato, texto, cores e arte pronta', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/divulgar'; await open(page, fixture, route)
  await selectOption(page.getByLabel('Formato da imagem', { exact: true }), 'STORY')
  await shot(page, info, route, 'arte-story')
  await page.getByRole('button', { name: 'Editar texto', exact: true }).click(); await shot(page, info, route, 'arte-texto')
  await page.getByRole('button', { name: 'Personalizar cores', exact: true }).click(); await shot(page, info, route, 'arte-cores')
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click()
  await expect(page.getByRole('img', { name: /^Prévia da arte:/ })).toBeVisible()
  await shot(page, info, route, 'arte-pronta')
})


test('OFP avançado formulário e descoberta — campos, finalidade e opt-in', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/formulario'; await open(page, fixture, route)
  await page.getByRole('button', { name: 'Configurar formulário', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Formulário da sua página', exact: true })
  await form.getByRole('checkbox', { name: 'Mostrar formulário na página publicada', exact: true }).check()
  await selectOption(form.getByLabel('O que você quer receber?', { exact: true }), 'quote')
  await shot(page, info, route, 'ativacao-finalidade-privacidade', false, true)
  await form.getByRole('button', { name: 'Escolher campos', exact: true }).click()
  await form.getByRole('checkbox', { name: 'Pedir Telefone', exact: true }).check()
  await shot(page, info, route, 'campos-opcionais-obrigatorios', false, true)
  await form.getByRole('button', { name: 'Salvar formulário', exact: true }).click()
  await expect(form).toHaveCount(0); await shot(page, info, route, 'formulario-ativado')
  await open(page, fixture, '/painel/perfil/descoberta')
  await page.getByRole('checkbox', { name: 'Mostrar na descoberta de páginas', exact: true }).check()
  await shot(page, info, '/painel/perfil/descoberta', 'descoberta-selecionada')
  await page.getByRole('button', { name: 'Salvar descoberta', exact: true }).click()
  await expect(page.getByText('Descoberta atualizada.', { exact: true })).toBeVisible()
  await shot(page, info, '/painel/perfil/descoberta', 'descoberta-salva')
})

test('OFP avançado foto — envio real, prévia e arquivo inválido', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const image = readFileSync(path.join(__dirname, 'fixtures/home-preview/reading.jpg'))
  await uploadVisualProfilePhoto(page, fixture, { bytes: image, mime: 'image/jpeg' })
  const route = '/painel/perfil/dados'; await shot(page, info, route, 'foto-enviada')
  await page.getByLabel('Foto do perfil', { exact: true }).setInputFiles({ name: 'arquivo-invalido.gif', mimeType: 'image/gif', buffer: Buffer.from('invalid') })
  await expect(page.getByRole('alert').first()).toBeVisible()
  await shot(page, info, route, 'foto-invalida-conserva-anterior')
})

test('OFP avançado restauração — confirmação, erro e rascunho recuperado', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); const content = await saveProfile(page, fixture); await publishProfile(page)
  expect((await roadmapApi(page, '/me/profile', 'PATCH', { expectedVersion: 1, content: { ...content, name: 'Comunidade revisada' } })).status).toBe(200); await publishProfile(page)
  const route = '/painel/perfil/historico'; await open(page, fixture, route)
  await page.getByRole('article', { name: 'Versão 1', exact: true }).getByRole('button', { name: 'Ver diferenças', exact: true }).click()
  const comparison = page.getByRole('dialog'); await expect(comparison).toBeVisible()
  await comparison.getByRole('button', { name: 'Restaurar no rascunho', exact: true }).click()
  await shot(page, info, route, 'confirmar-restauracao', false, true)
  await page.route('**/bff/v1/me/profile/revisions/*/restore', async request => request.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Não foi possível restaurar. Seu rascunho foi mantido.' }) }))
  await comparison.getByRole('button', { name: 'Confirmar restauração', exact: true }).click()
  await expect(comparison.getByRole('alert')).toBeVisible(); await shot(page, info, route, 'erro-restauracao-preserva-rascunho', true, true)
  await page.unrouteAll({ behavior: 'wait' })
  await comparison.getByRole('button', { name: 'Confirmar restauração', exact: true }).click()
  await expect(comparison).toHaveCount(0); await shot(page, info, route, 'versao-restaurada-no-rascunho')
})


test('OFP avançado grupos — editar, remover, ocultar e principal', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture)
  const route = '/painel/perfil/links'; await open(page, fixture, route); await firstGroup(page)
  await shot(page, info, route, 'grupo-aberto')
  for (const label of ['Editar grupo', 'Remover grupo']) await dialog(page, info, route, label)
  const card = page.locator('[data-profile-link]').first()
  for (const action of [/^Editar/, /^Remover/]) {
    await card.getByRole('button', { name: action }).click(); await expect(page.getByRole('dialog')).toBeVisible()
    await shot(page, info, route, action.source.includes('Editar') ? 'editar-link' : 'remover-link', false, true)
    await page.keyboard.press('Escape')
  }
  await page.getByRole('button', { name: 'Ocultar grupo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mostrar grupo', exact: true })).toBeVisible()
  await shot(page, info, route, 'grupo-oculto')
  await page.getByRole('button', { name: 'Mostrar grupo', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar aos grupos', exact: true }).click()
  await page.getByLabel('Mais opções da página', { exact: true }).click()
  await page.getByRole('button', { name: 'Botão principal', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Escolher botão principal', exact: true })).toBeVisible()
  await shot(page, info, route, 'escolher-principal', false, true)
})

test('OFP avançado busca — ligada e desligada com prévia real', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture)
  const route = '/painel/perfil/busca'; await open(page, fixture, route)
  const field = page.getByRole('region', { name: 'Busca da página', exact: true }).getByRole('checkbox').first()
  await field.check()
  await expect.poll(async () => (await roadmapApi(page, '/me/profile')).body.draft.appearance.searchEnabled).toBe(true)
  await shot(page, info, route, 'busca-ativada')
  await field.uncheck()
  await expect.poll(async () => (await roadmapApi(page, '/me/profile')).body.draft.appearance.searchEnabled).toBe(false)
  await shot(page, info, route, 'busca-desativada')
})

test('OFP avançado métricas — medição, dados, filtros e amostra insuficiente', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); const content = await saveProfile(page, fixture); await publishProfile(page); grantProfileCapability(fixture, 'profile.analytics')
  const route = '/painel/perfil/metricas'; await open(page, fixture, route); await shot(page, info, route, 'medicao-pausada')
  const pref = await roadmapApi(page, '/me/profile/measurement'); expect(pref.status).toBe(200)
  expect((await roadmapApi(page, '/me/profile/measurement', 'PATCH', { enabled: true, expectedVersion: pref.body.version })).status).toBe(200)
  const report: InteractionReport = { range: { from: '2026-10-01', to: '2026-10-24' }, revision: 1, viewport: 'ALL', revisions: [1], minimumSample: 10, retentionDays: 90, coverage: 'MEASURED', summary: { available: true, sessions: 48, pageViews: 64, blocks: [{ id: content.items[0].id, label: content.items[0].label, impressions: 40, clicks: 9, ctr: 22.5 }], scrollBuckets: [25, 50, 75, 100].map((threshold, index) => ({ threshold, label: threshold + '% da página alcançada', reached: [48, 35, 24, 10][index] })) } }
  await presentationGet(page, '/me/profile/interaction', report)
  await open(page, fixture, route); await shot(page, info, route, 'medicao-ativa-com-dados', true)
  await calendar(page, info, route, 'De', true)
  await page.getByLabel('De', { exact: true }).fill('25/10/2026')
  await page.getByLabel('De', { exact: true }).blur()
  await expect(page.getByRole('alert').filter({ hasText: 'Use uma data até' })).toBeVisible()
  const dateFeedback = await page.getByRole('alert').filter({ hasText: 'Use uma data até' }).boundingBox()
  const dateFrame = await page.getByLabel('De', { exact: true }).evaluate(element => element.closest('[data-control-frame]')!.getBoundingClientRect().bottom)
  expect(dateFeedback!.y, 'A validação da data deve ficar abaixo da superfície do campo').toBeGreaterThan(dateFrame)
  await shot(page, info, route, 'limite-da-data-inicial', true)
  await page.getByLabel('De', { exact: true }).fill('01/10/2026')
  await page.getByLabel('De', { exact: true }).blur()
  await selectOption(page.getByLabel('Tela do visitante', { exact: true }), 'MOBILE')
  await shot(page, info, route, 'filtro-celular', true)
  await presentationGet(page, '/me/profile/interaction', { ...report, summary: { ...report.summary, available: false, sessions: 0, pageViews: null, blocks: [], scrollBuckets: report.summary.scrollBuckets.map(row => ({ ...row, reached: null })) } })
  await open(page, fixture, route); await shot(page, info, route, 'amostra-insuficiente', true)
})

test('OFP avançado canais — pausado, revisão, etapas e grupo ausente', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture)
  const source = await redirect(page, 'Convite para a comunidade'), groupId = randomUUID()
  const current = await roadmapApi(page, '/me/profile/channel-groups'); expect(current.status).toBe(200)
  const state: ChannelGroupsResponse = { ...current.body, groups: [{ id: groupId, name: 'Onde participar', visible: true, channels: [
    { id: randomUUID(), label: 'Grupo de estudos', networkId: null, destinationRevisionId: source.destinationRevision.id, paused: false, available: true, destinationLabel: 'Convite para a comunidade', destinationUrl: 'https://example.com/f12-a', status: 'APPROVED', network: { name: 'Site', slug: 'site' } },
    { id: randomUUID(), label: 'Avisos da comunidade', networkId: null, destinationRevisionId: source.destinationRevision.id, paused: true, available: true, destinationLabel: 'Convite para a comunidade', destinationUrl: 'https://example.com/f12-a', status: 'APPROVED', network: { name: 'Site', slug: 'site' } },
    { id: randomUUID(), label: 'Acesso para revisar', networkId: null, destinationRevisionId: source.destinationRevision.id, paused: false, available: false, destinationLabel: 'Convite para a comunidade', destinationUrl: 'https://example.com/f12-a', status: 'REJECTED', network: null },
  ] }] }
  await presentationGet(page, '/me/profile/channel-groups', state)
  const route = '/painel/perfil/canais'
  await open(page, fixture, route); await shot(page, info, route, 'grupos-pausado-e-revisao', true)
  await dialog(page, info, route, 'Remover grupo Onde participar', true)
  await selectOption(page.getByLabel('Situação dos links permanentes', { exact: true }), 'READY')
  await expect(page.getByText('Nenhum grupo corresponde aos filtros.', { exact: true })).toBeVisible()
  await shot(page, info, route, 'filtro-sem-grupo-valido', true)
  const editorRoute = route + '/' + groupId
  await open(page, fixture, editorRoute)
  await page.getByRole('button', { name: 'Avançar', exact: true }).click()
  await shot(page, info, editorRoute, 'alternativas-pausadas-e-revisao', true)
  await page.getByRole('button', { name: 'Editar canal Acesso para revisar', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Editar link permanente', exact: true })).toBeVisible()
  await shot(page, info, editorRoute, 'revisar-destino-recusado', true, true)
  await page.getByRole('switch', { name: 'Mostrar título', exact: true }).uncheck()
  await shot(page, info, editorRoute, 'acesso-sem-titulo', true, true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Avançar', exact: true }).click()
  await shot(page, info, editorRoute, 'revisao-do-grupo', true)
  const absent = route + '/' + randomUUID()
  await open(page, fixture, absent)
  await expect(page.getByText('Este grupo não está disponível nesta conta.', { exact: true })).toBeVisible()
  await shot(page, info, absent, 'grupo-ausente', true)
})

test('OFP avançado painel — resumo com recurso próprio e menu móvel', async ({ page }, info) => {
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const id = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${id}','${fixture.tenantId}','${fixture.ownerId}','https://example.com/ondas-dashboard','Encontros de leitura','Uma comunidade para compartilhar leituras e descobertas',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  const route = '/painel'; await open(page, fixture, route)
  await shot(page, info, route, 'resumo-com-link-publicado')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) {
    await menu.click(); await shot(page, info, route, 'navegacao-do-painel-aberta', false, true)
    await page.keyboard.press('Escape')
  }
})

test('OFP avançado apresentação — contatos, métricas, seguidores e retirada', async ({ page }, info) => {
  test.setTimeout(240_000)
  const fixture = isolatedFixture(); await login(page, fixture); await saveProfile(page, fixture); await publishProfile(page)
  const route = '/painel/perfil/midia-kit'; await open(page, fixture, route)
  await page.getByRole('button', { name: 'Configurar apresentação', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Configurar apresentação', exact: true })
  await shot(page, info, route, 'apresentacao-contatos', false, true)
  await form.getByRole('button', { name: 'Continuar', exact: true }).click()
  await shot(page, info, route, 'apresentacao-metricas-sem-links', false, true)
  await form.getByRole('button', { name: 'Continuar', exact: true }).click()
  await form.getByRole('button', { name: 'Adicionar seguidores informados', exact: true }).click()
  await form.getByLabel('Quantidade de seguidores', { exact: true }).fill('12500')
  await shot(page, info, route, 'apresentacao-seguidores-informados', false, true)
  await calendar(page, info, route, 'Data dessa informação')
  const dates = await page.evaluate(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const tomorrow = new Date(today + 'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    return { today: today.split('-').reverse().join('/'), tomorrow: tomorrow.toISOString().slice(0, 10).split('-').reverse().join('/') }
  })
  await form.getByLabel('Data dessa informação', { exact: true }).fill(dates.tomorrow)
  await form.getByLabel('Data dessa informação', { exact: true }).blur()
  await expect(form.getByRole('alert').filter({ hasText: 'Use uma data até' })).toBeVisible()
  await shot(page, info, route, 'data-informada-fora-do-limite', false, true)
  await form.getByLabel('Data dessa informação', { exact: true }).fill(dates.today)
  await form.getByLabel('Data dessa informação', { exact: true }).blur()
  await form.getByRole('button', { name: 'Salvar apresentação para parceiros', exact: true }).click()
  await expect(form).toHaveCount(0)
  await shot(page, info, route, 'apresentacao-configurada')
  await page.getByRole('button', { name: 'Publicar apresentação', exact: true }).click()
  await expect(page.getByText('Apresentação publicada.', { exact: true })).toBeVisible()
  await shot(page, info, route, 'apresentacao-publicada-com-dado-informado')
  await dialog(page, info, route, 'Retirar apresentação')
  const linkId = randomUUID()
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${linkId}','${fixture.tenantId}','${fixture.ownerId}','https://example.com/ondas-media-metrics','Encontros de leitura','Comunidade com materiais e encontros',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  await open(page, fixture, route)
  await page.getByRole('button', { name: 'Configurar apresentação', exact: true }).click()
  await form.getByRole('button', { name: 'Continuar', exact: true }).click()
  await form.getByRole('button', { name: 'Adicionar métrica medida', exact: true }).click()
  await shot(page, info, route, 'metrica-medida-em-edicao', false, true)
  await calendar(page, info, route, 'De')
  await calendar(page, info, route, 'Até')
})
