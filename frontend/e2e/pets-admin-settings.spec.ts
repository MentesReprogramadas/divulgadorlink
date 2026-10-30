import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

test('configures Shopee alongside Mercado Livre and desired group policy without claiming unsupported approval', async ({ page, context }, testInfo) => {
  await context.addCookies([{ name: 'catalogo_role', value: 'ADMIN', domain: 'localhost', path: '/' }, { name: 'csrf', value: 'a'.repeat(32), domain: 'localhost', path: '/' }, { name: 'tla_consent', value: 'denied', domain: 'localhost', path: '/' }])
  const segment = { id: 'pets', name: 'Pets', groupName: 'Achadinhos Pet', slug: 'pets', description: 'Ofertas para pets.', imageUrl: null, capacity: 1024, instanceId: null, instanceIds: [], autoExpand: true, enabled: true, provisionState: 'IDLE' }
  const snapshot = { instances: [], segments: [segment], groups: [], offers: [], broadcasts: [], deliveries: [], summary: { instances: 0, segments: 1, groups: 0, offers: 0, pending: 0, sent: 0, uncertain: 0, failed: 0 } }
  let shopee = { provider: 'SHOPEE', configured: false, connected: false, status: 'NOT_CONFIGURED', accountLabel: '', subIds: [] as string[], updatedAt: null }
  let policy = { enabled: false, disappearingSeconds: 604800, joinApproval: true, autoApproveDelaySeconds: 120 }
  const mutations: Array<{ path: string; method: string; body: Record<string, unknown> }> = []
  await page.route('**/bff/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname.replace('/bff', '')
    if (request.method() !== 'GET') {
      const body = request.postDataJSON() ?? {}
      mutations.push({ path: pathname, method: request.method(), body })
      if (pathname.endsWith('/catalog/shopee')) shopee = { ...shopee, configured: true, status: 'CONFIGURED', accountLabel: body.accountLabel, subIds: body.subIds }
      if (pathname.endsWith('/group-policy')) policy = { ...policy, ...body }
      return route.fulfill({ json: {} })
    }
    const body = pathname.endsWith('/auth/session') ? { role: 'ADMIN', status: 'ACTIVE', canSubmit: true }
      : pathname.endsWith('/team/context') ? { ownerId: null, grants: null }
      : pathname.endsWith('/membership') ? { since: '2026-10-01T00:00:00Z', until: '2026-10-30T12:00:00Z', totals: { joins: 0, rejoins: 0, leaves: 0 }, groups: [] }
      : pathname === '/v1/admin/affiliates' || pathname === '/v1/admin/affiliates/segments/pets' ? snapshot
      : pathname.endsWith('/catalog/status') ? { configured: false, connected: false, status: 'NOT_CONFIGURED', clientId: null, redirectUri: '', affiliateConfigured: false }
      : pathname.endsWith('/catalog/shopee') ? shopee
      : pathname.endsWith('/group-policy') ? { ...policy, groups: [{ id: 'g1', name: 'Achadinhos Pet #1', groupPolicyState: 'UNSUPPORTED', groupPolicyErrorCode: 'admission_extension_required', groupPolicyNextRunAt: null }] }
      : pathname.endsWith('/discovery') ? { providers: ['MERCADO_LIVRE','SHOPEE'], enabled: true, usesSegmentName: true, terms: ['Pets'], products: [], counts: null, checkedAt: '2026-10-30T12:00:00Z', nextRunAt: null, status: 'READY', error: null }
      : {}
    return route.fulfill({ json: body })
  })
  await page.goto('/admin/afiliados/segmentacoes/pets')
  await page.getByRole('tab', { name: 'Ofertas', exact: true }).click()
  await page.getByRole('tab', { name: 'Configurações', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Shopee Afiliados' })).toBeVisible()
  await page.getByRole('button', { name: 'Configurar Shopee', exact: true }).click()
  await page.getByLabel('Identificação da conta Shopee').fill('Pets Shopee')
  await page.getByLabel('App ID Shopee', { exact: true }).fill('123456')
  await page.getByLabel('Segredo Shopee', { exact: true }).fill('fixture-only-secret')
  await page.getByLabel('Identificadores de atribuição (Sub IDs)').fill('pets, whatsapp')
  await page.getByRole('button', { name: 'Salvar credenciais Shopee' }).click()
  await expect(page.getByText('Configurada; verificação pendente', { exact: false })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Fonte dos produtos' })).toHaveCount(0)
  await expect(page.getByText(/Shopee e Mercado Livre são consultados juntos/)).toBeVisible()
  await page.getByRole('button', { name: 'Salvar termos' }).click()
  await expect.poll(() => mutations.find(item => item.path.endsWith('/discovery/config'))?.body).toEqual({enabled:true,terms:['Pets']})
  await expect(page.getByRole('combobox', { name: /termo/i })).toHaveCount(0)
  const evidence = path.resolve('../docs/frontend-profissional/evidencias/pets-landing-2026-10-30')
  await mkdir(evidence, { recursive: true })
  await page.screenshot({ path: path.join(evidence, `${testInfo.project.name}-shopee-settings.png`), fullPage: true })
  expect((await new AxeBuilder({ page }).include('[aria-labelledby="shopee-settings-title"]').analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Configurar segmentação', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar segmentação' })
  await expect(dialog.getByText(/Extensão do provedor necessária; aplicação pendente/)).toBeVisible()
  await dialog.getByRole('checkbox', { name: 'Automatizar esta política nos grupos' }).check()
  await dialog.getByLabel('Espera antes da aprovação automática (segundos)').fill('120')
  await dialog.getByRole('button', { name: 'Salvar política dos grupos' }).click()
  await expect.poll(() => mutations.find(item => item.path.endsWith('/group-policy'))?.body).toEqual({ enabled: true, disappearingSeconds: 604800, joinApproval: true, autoApproveDelaySeconds: 120 })
  await expect(dialog.getByText('Preferências salvas.', { exact: false })).toBeVisible()
  await expect(dialog.getByText('Aplicada', { exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([])
  await dialog.getByRole('button', { name: 'Salvar política dos grupos' }).focus()
  await expect(dialog.getByRole('button', { name: 'Salvar política dos grupos' })).toBeFocused()
  await page.screenshot({ path: path.join(evidence, `${testInfo.project.name}-group-policy.png`), fullPage: true })
})
