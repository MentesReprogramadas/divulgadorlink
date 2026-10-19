import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { runtime } from './runtime.cjs'
import { sql } from './db'
import AxeBuilder from '@axe-core/playwright'
import {capturePage} from './capture-page'

const A = runtime.web('related.localhost')
function fixture(suffix: string) {
  const s = JSON.parse(readFileSync(path.join(__dirname, 'state.json'), 'utf8')).related as { tenantId: string; nicheId: string; networkId: string }
  const prefix = 'f03-' + suffix, source = prefix + '-source'
  sql(`UPDATE links SET status='UNAVAILABLE' WHERE "tenantId"='${s.tenantId}'; INSERT INTO niches (id,"tenantId",name,slug,"requiresAge","updatedAt") VALUES ('adult-${prefix}','${s.tenantId}','Adulto','adult-${prefix}',true,NOW());`)
  function link(id: string, name: string, status = 'PUBLISHED', adult = false) {
    sql(`INSERT INTO links (id,"tenantId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES ('${id}','${s.tenantId}','${runtime.stubOrigin}/related-destination?id=${id}','${name}','Materiais e conversas da comunidade','${s.networkId}','${adult ? 'adult-' + prefix : s.nicheId}','${status}',false,true,NOW())`)
  }
  link(source, 'Comunidade de estudos')
  for (let i = 0; i < 9; i++) link(prefix + '-item-' + i, 'Comunidade relacionada ' + i)
  link(prefix + '-hidden', 'SentinelaPrivadaF03', 'PENDING_MODERATION')
  link(prefix + '-adult', 'SentinelaAdultaF03', 'PUBLISHED', true)
  link(prefix + '-adult-source', 'Origem adulta', 'PUBLISHED', true)
  sql(`UPDATE links SET "cityId"='3550308',"languageTag"='pt',modality='ONLINE' WHERE "tenantId"='${s.tenantId}' AND id LIKE '${prefix}%' AND id<>'${prefix}-item-8'`)
  return { ...s, prefix, source }
}

test('F03-E01/T01/T03/T04 sugestões reais, destino e analytics RELATED; vazio remove seção', async ({ page }, info) => {
  const s = fixture('journey-' + info.project.name)
  const raw = await page.request.get(runtime.web('127.0.0.1') + '/link/' + s.source, { headers: { host: 'related.localhost:' + runtime.webPort } })
  expect(await raw.text()).toContain('Comunidade relacionada')
  await page.goto(A + '/link/' + s.source)
  const section = page.getByRole('region', { name: 'Links relacionados' })
  await expect(section.getByRole('link')).toHaveCount(6)
  const detail=page.getByRole('region',{name:'Comunidade de estudos',exact:true})
  await expect(detail).toContainText('São Paulo / SP');await expect(detail).toContainText('português');await expect(detail).toContainText('Online')
  await expect(section.getByText('São Paulo / SP', {exact:true}).first()).toBeVisible()
  await expect(section).not.toContainText('Sentinela')
  const chosen = section.getByRole('link').first(), chosenName = await chosen.innerText(), chosenId = new URL((await chosen.getAttribute('href'))!, A).pathname.split('/').at(-1)!
  await chosen.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(chosenName)
  await expect.poll(() => sql(`SELECT COUNT(*) FROM analytics_events WHERE "linkId"='${chosenId}' AND surface='RELATED' AND kind='IMPRESSION'`)).toBe('1')
  // The destination is the real local HTTP provider stub; /go and persistence remain real.
  await page.getByRole('link', { name: 'Acessar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Destino externo fixture' })).toBeVisible()
  expect(sql(`SELECT COUNT(*) FROM analytics_events WHERE "linkId"='${chosenId}' AND surface='RELATED' AND kind='CLICK'`)).toBe('1')
  sql(`UPDATE links SET status='UNAVAILABLE' WHERE "tenantId"='${s.tenantId}' AND id<>'${s.source}'`)
  await page.goto(A + '/link/' + s.source)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comunidade de estudos')
  await expect(section).toHaveCount(0)
})

test('F03-E02/T01 privacidade no HTML, payload e DOM; aceite adulto usa API real', async ({ page }, info) => {
  const s = fixture('privacy-' + info.project.name)
  const html = await (await page.request.get(runtime.web('127.0.0.1') + '/link/' + s.source, { headers: { host: 'related.localhost:' + runtime.webPort } })).text()
  expect(html).not.toContain('SentinelaPrivadaF03'); expect(html).not.toContain('SentinelaAdultaF03')
  const adultHtml = await (await page.request.get(runtime.web('127.0.0.1') + '/link/' + s.prefix + '-adult-source', { headers: { host: 'related.localhost:' + runtime.webPort } })).text()
  expect(adultHtml).not.toContain('SentinelaAdultaF03')
  const wrongTenant = await page.request.get(runtime.web('127.0.0.1') + '/bff/v1/links/' + s.source + '/related', { headers: { host: 'tenant-b.localhost:' + runtime.webPort } })
  expect(wrongTenant.status()).toBe(404); expect(await wrongTenant.text()).not.toContain('Comunidade relacionada')
  await page.goto(A + '/link/' + s.prefix + '-adult-source')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('SentinelaAdultaF03')
  await page.getByRole('button', { name: 'Tenho 18 anos ou mais', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Links relacionados' })).toContainText('SentinelaAdultaF03')
  await page.reload(); await expect(page.getByRole('region', { name: 'Links relacionados' })).toContainText('SentinelaAdultaF03')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('F03-E03/T01/T03 paginação, offline recuperável, teclado e 320px com texto 200%', async ({ page }, info) => {
  const s = fixture('offline-' + info.project.name)
  await page.goto(A + '/link/' + s.source)
  const section = page.getByRole('region', { name: 'Links relacionados' }), more = section.getByRole('button', { name: 'Ver mais relacionados', exact: true })
  await expect(section.getByRole('link')).toHaveCount(6)
  const geometry=await page.evaluate(()=>{
    const main=document.querySelector('main')!,summary=document.querySelector('section[aria-labelledby="link-title"]')!,related=document.querySelector('section[aria-labelledby="related-links-title"]')!
    const a=main.getBoundingClientRect(),b=summary.getBoundingClientRect(),c=related.getBoundingClientRect(),css=getComputedStyle(main)
    return {viewport:main.parentElement!.getBoundingClientRect().width,main:a.width,summary:b.width,center:b.x+b.width/2,related:c.width,available:a.width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)}
  })
  expect(geometry.main).toBe(geometry.viewport);expect(Math.abs(geometry.center-geometry.viewport/2)).toBeLessThan(2);expect(Math.abs(geometry.related-geometry.available)).toBeLessThan(2)
  if(geometry.viewport>1000){expect(geometry.summary).toBeLessThanOrEqual(720);expect(geometry.related).toBeGreaterThan(1000)}
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations,JSON.stringify(axe.violations)).toEqual([])
  await capturePage(page, info.outputPath('related-links.png'));await capturePage(page,info.outputPath('detail-viewport.png'),false)
  await page.context().setOffline(true); await more.click()
  await expect(section.getByRole('alert')).toContainText('Os links anteriores foram mantidos.')
  await expect(section.getByRole('link')).toHaveCount(6)
  await page.context().setOffline(false); await more.focus(); await page.keyboard.press('Enter')
  await expect(section.getByRole('link')).toHaveCount(9)
  await expect(section.getByRole('status')).toBeFocused()
  await expect(more).toHaveCount(0)
  expect(new Set(await section.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))).size).toBe(9)
  await page.setViewportSize({ width: 320, height: 844 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('related-320-text200.png'), fullPage: true })
  await page.reload(); await expect(section.getByRole('link')).toHaveCount(6)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp('/link/' + s.source + '$'))
})
