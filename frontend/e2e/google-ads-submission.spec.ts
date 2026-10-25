import { expect, test } from '@playwright/test'
import {runtime} from './runtime.cjs'
import {selectOption} from './select-control'

const origin=process.env.GOOGLE_ADS_TEST_ORIGIN ?? runtime.web('tenant-a.localhost')
test.use({ baseURL: origin })

for (const scenario of ['accepted', 'published', 'denied', 'pending-consent', 'rejected', 'duplicate', 'offline'] as const) {
  test(`Google Ads: envio de link ${scenario}`, async ({ page }, testInfo) => {
    const consent = scenario === 'pending-consent' ? null : scenario === 'denied' ? 'denied' : 'marketing'
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(/google|doubleclick|facebook/, async route => {
      if (route.request().url().startsWith('https://www.googletagmanager.com/gtag/js')) {
        await route.fulfill({ contentType: 'application/javascript', body: '' })
      } else {
        await route.abort()
      }
    })
    await page.route('**/anuncio/pixel', route => route.fulfill({ json: { enabled: false } }))
    await page.route('**/bff/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/bff/v1/auth/session') {
        await route.fulfill({ json: { role: 'USER', status: 'ACTIVE', canSubmit: true } })
      } else if (url.pathname === '/bff/v1/team/context') {
        await route.fulfill({ json: { ownerId: null, grants: null } })
      } else if (url.pathname === '/bff/v1/catalog/discovery-options') {
        await route.fulfill({ json: { languages: [], cities: [], selectedCity: null, modalities: [] } })
      } else if (url.pathname === '/bff/v1/home') {
        await route.fulfill({ json: {
          networks: [{ id: 'net', name: 'Site', slug: 'site' }],
          niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
        } })
      } else if (url.pathname === '/bff/v1/links' && route.request().method() === 'POST') {
        if (scenario === 'offline') await route.abort()
        else if (scenario === 'duplicate') await route.fulfill({ status: 409, json: { message: 'Esse link já está no catálogo.' } })
        else await route.fulfill({ status: 201, json: {
          id: 'google-ads-test-link',
          status: scenario === 'rejected' ? 'PRE_REJECTED' : scenario === 'published' ? 'PUBLISHED' : 'PENDING_MODERATION',
        } })
      } else if (url.pathname === '/bff/v1/links/mine') {
        await route.fulfill({ json: { links: [], slotsUsed: 0, total: 0 } })
      } else await route.fulfill({ json: {} })
    })
    if (consent) {
      await page.context().addCookies([{ name: 'tla_consent', value: consent, url: origin }])
    }
    await page.goto('/painel/links/novo')
    const conversions = () => page.evaluate(() => {
      const host = window as Window & { dataLayer?: ArrayLike<unknown>[] }
      return (host.dataLayer ?? []).map(command => Array.from(command)).filter(command => command[0] === 'event' && command[1] === 'conversion')
    })
    await expect(page.getByLabel('Título do link')).toBeVisible()
    expect(await conversions()).toEqual([])
    await page.getByLabel('Título do link').fill('Link de demonstração')
    await page.getByLabel('Link de acesso').fill('https://example.com/google-ads')
    await page.getByRole('button',{name:'Continuar',exact:true}).click()
    await page.getByLabel('Descrição',{exact:true}).fill('Conteúdo de teste sem dados pessoais')
    await selectOption(page.getByLabel('Rede do link'),'net')
    await selectOption(page.getByLabel('Assunto do link'),'niche')
    await page.getByRole('button',{name:'Continuar',exact:true}).click()
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    if (scenario === 'offline' || scenario === 'duplicate') {
      await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { name: scenario === 'rejected' ? 'Envio não aceito' : 'Enviado para análise.' })).toBeVisible()
    }
    if (scenario === 'accepted' || scenario === 'published') {
      expect(await conversions()).toEqual([['event', 'conversion', {
        send_to: 'AW-18513720323/uMyECICKtp4dEIPog_xE',
        value: 1.0,
        currency: 'BRL',
        transaction_id: 'google-ads-test-link',
      }]])
      await testInfo.attach('envio-concluido', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' })
      await expect(page).toHaveURL(/\/painel\/links$/)
      expect(await conversions()).toHaveLength(1)
    } else expect(await conversions()).toEqual([])
    if (consent !== 'marketing') await expect(page.locator('#google-ads-tag')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
