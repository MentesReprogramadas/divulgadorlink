import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { isolatedFixture, login } from './ondas-visual-fixture'
import { sql } from './db'
import { runtime } from './runtime.cjs'
import type { AvailabilityData } from '../src/features/availability/availability-contract'

// Diagnostic only. Uses the existing dev runtime and creates UUID-owned fixtures.
// It starts no process and never suppresses, clears or retries a browser error.
const developmentOrigin = 'http://checklist.localhost:3013'
type BrowserError = { message: string; stack?: string; url: string; time: number }
type BrowserConsole = { type: string; text: string; url: string; time: number }
type BrowserDocument = { url: string; status: number; html: Promise<string> }
type HydrationProbe = {
  snapshots: Array<{ event: string; time: number; html: string }>
  mutations: Array<Record<string, unknown>>
  droppedMutations: number
  browserEvents: Array<Record<string, unknown>>
}

async function installProbe(page: Page) {
  const errors: BrowserError[] = [], consoleMessages: BrowserConsole[] = []
  const documents: BrowserDocument[] = []
  page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack, url: page.url(), time: Date.now() }))
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), url: page.url(), time: Date.now() })
  })
  page.on('response', response => {
    if (response.request().resourceType() === 'document') documents.push({ url: response.url(), status: response.status(), html: response.text().catch(() => '') })
  })
  await page.addInitScript(() => {
    const probe = { snapshots: [] as Array<{ event: string; time: number; html: string }>, mutations: [] as Array<Record<string, unknown>>, droppedMutations: 0, browserEvents: [] as Array<Record<string, unknown>> }
    Object.defineProperty(window, '__ondasStressHydration', { value: probe })
    const snapshot = (event: string) => probe.snapshots.push({ event, time: performance.now(), html: document.documentElement?.outerHTML ?? '' })
    const describe = (node: Node) => node instanceof Element ? node.outerHTML.slice(0, 1600) : node.textContent?.slice(0, 1600)
    new MutationObserver(records => {
      for (const record of records) {
        // Keep the latest mutations around the first failure, including the parser.
        if (probe.mutations.length >= 800) { probe.mutations.shift(); probe.droppedMutations++ }
        probe.mutations.push({ time: performance.now(), type: record.type, target: record.target instanceof Element ? record.target.tagName + (record.target.id ? '#' + record.target.id : '') : record.target.nodeName, attribute: record.attributeName, previous: record.oldValue, added: [...record.addedNodes].map(describe), removed: [...record.removedNodes].map(describe) })
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true })
    document.addEventListener('DOMContentLoaded', () => snapshot('DOMContentLoaded'), { once: true })
    window.addEventListener('error', event => {
      probe.browserEvents.push({ event: 'window-error', message: event.message, stack: event.error?.stack, time: performance.now() })
      snapshot('window-error')
    })
    window.addEventListener('unhandledrejection', event => {
      probe.browserEvents.push({ event: 'unhandledrejection', message: String(event.reason), stack: event.reason?.stack, time: performance.now() })
      snapshot('unhandledrejection')
    })
  })
  return { errors, consoleMessages, documents }
}

async function instrumentProductionMismatch(page: Page) {
  const instrumentation = { matched: 0, patched: 0, failure: '' }
  await page.route(/\/_next\/static\/chunks\/4bd1b696-[a-f0-9]+\.js(?:\?.*)?$/, async route => {
    const response = await route.fetch(), source = await response.text()
    const opening = 'function rD(e){'
    instrumentation.matched++
    if (source.split(opening).length !== 2) {
      instrumentation.failure = 'Expected exactly one React 418 throw function rD(e); this build needs a fresh signature inspection.'
      await route.fulfill({ response, body: source })
      return
    }
    // Local browser response instrumentation only. The original rD body and throw
    // remain byte-for-byte after this prefix. No React error is caught or suppressed.
    const probe = `function rD(e){try{const n=t=>typeof t==="function"?t.displayName||t.name:typeof t==="string"?t:String(t),a=t=>t?{nodeType:t.nodeType,name:t.nodeName,html:t.outerHTML||t.nodeValue}:null,c=[];for(let f=e;f&&c.length<35;f=f.return)c.push({type:n(f.type),tag:f.tag,key:f.key,index:f.index,className:f.pendingProps?.className});const p=e.pendingProps||{},m={time:performance.now(),url:location.href,expected:{type:n(e.type),tag:e.tag,key:e.key,index:e.index,props:Object.fromEntries(Object.entries(p).filter(([k,v])=>["string","number","boolean"].includes(typeof v)||v===null))},actual:a(rN),actualParent:a(rN?.parentNode),hydrationParent:{type:n(rP?.type),tag:rP?.tag},chain:c};(window.__ondasMismatch??=[]).push(m);window.__ondasStressHydration?.snapshots.push({event:"react-before-418",time:performance.now(),html:document.documentElement.outerHTML});}catch(d){(window.__ondasMismatchProbeErrors??=[]).push(String(d))}`
    await route.fulfill({ response, body: source.replace(opening, probe) })
    instrumentation.patched++
  })
  return instrumentation
}

async function firstStructuralDifference(page: Page, serverHtml: string, clientHtml: string) {
  return page.evaluate(({ serverHtml, clientHtml }) => {
    const parser = new DOMParser(), server = parser.parseFromString(serverHtml, 'text/html'), client = parser.parseFromString(clientHtml, 'text/html')
    // These are inert Next payload/metadata and the diagnostic overlay, rather than app content.
    for (const document of [server, client]) document.querySelectorAll('script, style, link, meta, nextjs-portal').forEach(node => node.remove())
    const differences: Array<Record<string, unknown>> = []
    function compare(left: Node | undefined, right: Node | undefined, path: string) {
      if (differences.length >= 30) return
      if (!left || !right) { differences.push({ path, kind: 'presence', server: left instanceof Element ? left.outerHTML : left?.textContent, client: right instanceof Element ? right.outerHTML : right?.textContent }); return }
      if (left.nodeType !== right.nodeType || left.nodeName !== right.nodeName) { differences.push({ path, kind: 'node', server: left instanceof Element ? left.outerHTML : left.textContent, client: right instanceof Element ? right.outerHTML : right.textContent }); return }
      if (left.nodeType === Node.TEXT_NODE && left.textContent !== right.textContent) differences.push({ path, kind: 'text', server: left.textContent, client: right.textContent })
      if (left instanceof Element && right instanceof Element) {
        const attributes = new Set([...left.getAttributeNames(), ...right.getAttributeNames()])
        for (const name of attributes) if (left.getAttribute(name) !== right.getAttribute(name)) differences.push({ path, kind: 'attribute', name, server: left.getAttribute(name), client: right.getAttribute(name) })
      }
      const count = Math.max(left.childNodes.length, right.childNodes.length)
      for (let index = 0; index < count; index++) compare(left.childNodes[index], right.childNodes[index], path + '/' + index)
    }
    compare(server.body, client.body, 'body')
    return { note: 'Observed SSR versus error-time DOM differences; post-hydration effects can be expected differences. This alone does not establish causality.', differences }
  }, { serverHtml, clientHtml })
}

async function attachFirstFailure(page: Page, info: TestInfo, input: { iteration: number; route: string; serverHtml: string; errors: BrowserError[]; consoleMessages: BrowserConsole[]; documents: BrowserDocument[]; history: unknown[]; navigationError?: string }) {
  const probe = await page.evaluate(() => (window as Window & { __ondasStressHydration?: HydrationProbe }).__ondasStressHydration ?? null).catch(() => null)
  const clientHtml = await page.content().catch(() => '')
  const atError = probe?.snapshots.find(snapshot => ['react-before-418', 'window-error', 'unhandledrejection'].includes(snapshot.event))?.html ?? clientHtml
  const errorUrl = input.errors[0]?.url ?? page.url()
  const firstDocument = input.documents.findLast(document => document.url === errorUrl)
  const serverHtml = firstDocument ? await firstDocument.html : input.serverHtml
  const difference = await firstStructuralDifference(page, serverHtml, atError).catch(error => ({ diagnosticError: String(error) }))
  const internal = await page.evaluate(() => { const state = window as Window & { __ondasMismatch?: unknown[]; __ondasMismatchProbeErrors?: string[] }; return { mismatches: state.__ondasMismatch ?? [], captureErrors: state.__ondasMismatchProbeErrors ?? [] } }).catch(() => null)
  await info.attach('first-failure-complete.json', { contentType: 'application/json', body: JSON.stringify({ ...input, serverHtml: undefined, documents: input.documents.map(document => ({ url: document.url, status: document.status })), probe, internal, difference }, null, 2) })
  await info.attach('first-failure-server.html', { contentType: 'text/html', body: serverHtml })
  await info.attach('first-failure-error-time-client.html', { contentType: 'text/html', body: atError })
  await info.attach('first-failure-settled-client.html', { contentType: 'text/html', body: clientHtml })
  await info.attach('first-failure.png', { contentType: 'image/png', body: await page.screenshot({ fullPage: true }) })
}

async function runStress(page: Page, info: TestInfo, origin: string, production = false) {
  test.setTimeout(1_200_000)
  const fixture = { ...isolatedFixture(), origin }, id = randomUUID()
  // Only these newly created UUID accounts/resources are changed.
  sql(`UPDATE users SET role='ADMIN' WHERE id='${fixture.otherId}' AND "tenantId"='${fixture.tenantId}'`)
  sql(`INSERT INTO links(id,"tenantId","ownerId","canonicalUrl",name,description,"networkId","nicheId",status,"occupiesSlot","everPublished","updatedAt") VALUES('${id}','${fixture.tenantId}','${fixture.otherId}','https://example.com/ondas-hydration-stress','Comunidade de criação','Encontros e projetos compartilhados.',(SELECT id FROM networks WHERE "tenantId"='${fixture.tenantId}' AND slug='site'),(SELECT id FROM niches WHERE "tenantId"='${fixture.tenantId}' AND "requiresAge"=false LIMIT 1),'PUBLISHED',false,true,now())`)
  await page.setViewportSize({ width: info.project.use.isMobile ? 390 : 1440, height: info.project.use.isMobile ? 844 : 900 })
  await page.clock.setFixedTime(new Date('2026-10-24T12:00:00Z'))
  const observed = await installProbe(page)
  const instrumentation = production ? await instrumentProductionMismatch(page) : null
  const history: Array<Record<string, unknown>> = []
  try {
    await login(page, fixture, true)
    if (observed.errors.length) {
      await attachFirstFailure(page, info, { iteration: -1, route: 'login-bootstrap', serverHtml: '', ...observed, history })
      expect(observed.errors, 'Login hydration errors are also preserved').toEqual([])
    }
    if (instrumentation) {
      expect(instrumentation.failure).toBe('')
      expect(instrumentation.patched, 'The production diagnostic must actually instrument the throw site').toBeGreaterThan(0)
    }
    const facet = { id: 'visual-facet', name: 'Arte', slug: 'arte', requiresAge: false, isPublicFacet: true, summary: 'Projetos da comunidade.', substantiveCount: 8, indexable: true }
    await page.route(url => url.pathname === '/bff/v1/admin/facets', route => route.fulfill({ json: { niches: [facet], networks: [{ ...facet, id: 'visual-network', name: 'Site', slug: 'site' }] } }))
    await page.route(url => url.pathname === '/bff/v1/admin/settings/impressions', route => route.fulfill({ json: { showImpressions: true } }))
    await page.route(url => url.pathname === '/bff/v1/admin/settings/moderation', route => route.fulfill({ json: { threshold: .8 } }))
    let state: AvailabilityData['availability']['state'] = 'UNKNOWN'
    await page.route(url => url.pathname === '/bff/v1/links/' + id + '/availability', route => route.fulfill({ json: { link: { id, name: 'Comunidade de criação', canonicalUrl: 'https://example.com/ondas-hydration-stress', status: 'PUBLISHED' }, availability: { version: 2, state, checkedAt: state === 'UNKNOWN' ? null : '2026-10-24T12:00:00Z', disabledAt: null, failures: state === 'SUSPECT' ? 2 : 0 }, proposals: [], pausedPromotions: [], canPropose: true } satisfies AvailabilityData }))
    await page.route(url => url.pathname === '/bff/v1/analytics/links/' + id + '/performance', route => route.fulfill({ status: 403, json: { message: 'Sem acesso nesta simulação local.' } }))
    const routes = ['/painel', '/painel/links/' + id + '/disponibilidade', '/admin/configuracoes', '/painel/links/' + id + '/resultado']
    for (let iteration = 0; iteration < 100; iteration++) {
      const route = routes[iteration % routes.length]
      state = (['UNKNOWN', 'ACCESSIBLE', 'SUSPECT', 'INCONCLUSIVE', 'UNAVAILABLE'] as const)[Math.floor(iteration / routes.length) % 5]
      let serverHtml = '', navigationError: string | undefined
      try {
        const response = await page.goto(fixture.origin + route, { waitUntil: 'domcontentloaded' })
        serverHtml = await response?.text() ?? ''
        expect(response?.status()).toBe(200)
        await expect(page.getByRole('button', { name: 'Menu', exact: true, includeHidden: true })).toBeEnabled()
        await expect(page.locator('[data-skeleton]:visible, [data-pending="true"]:visible, [aria-busy="true"]:visible')).toHaveCount(0, { timeout: 60_000 })
        if (route === '/admin/configuracoes') await expect(page.getByRole('slider', { name: 'Limiar de aprovação da IA' })).toBeVisible()
        if (route.endsWith('/disponibilidade')) await expect(page.getByRole('region', { name: 'Comunidade de criação', exact: true })).toBeVisible()
        if (route.endsWith('/resultado')) await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
      } catch (error) { navigationError = String(error) }
      const probe = await page.evaluate(() => (window as Window & { __ondasStressHydration?: HydrationProbe }).__ondasStressHydration ?? null).catch(() => null)
      const newConsoleHydration = observed.consoleMessages.filter(message => /hydration|hydrated|react error #41[89]|server rendered HTML/i.test(message.text))
      history.push({ iteration, route, availability: state, documentBytes: serverHtml.length, errors: [...observed.errors], consoleHydration: newConsoleHydration, navigationError, earlyEvents: probe?.snapshots.map(snapshot => ({ event: snapshot.event, time: snapshot.time })), droppedMutations: probe?.droppedMutations })
      if (observed.errors.length || newConsoleHydration.length || navigationError) {
        await attachFirstFailure(page, info, { iteration, route, serverHtml, ...observed, history, navigationError })
        expect({ errors: observed.errors, consoleHydration: newConsoleHydration, navigationError }, 'First hydration/navigation failure is preserved and must fail this diagnostic').toEqual({ errors: [], consoleHydration: [], navigationError: undefined })
      }
    }
  } finally {
    await info.attach('hydration-stress-history.json', { contentType: 'application/json', body: JSON.stringify({ runtime: origin, instrumentation, plannedNavigations: 100, completed: history.length, history, errors: observed.errors, consoleMessages: observed.consoleMessages }, null, 2) })
  }
  expect(history).toHaveLength(100)
  expect(observed.errors).toEqual([])
}

test('Ondas diagnóstico dev: 100 navegações de hidratação entre quatro superfícies', async ({ page }, info) => {
  await runStress(page, info, developmentOrigin)
})

test('Ondas diagnóstico production: 100 navegações com Fiber e DOM antes do React 418', async ({ page }, info) => {
  await runStress(page, info, runtime.web('checklist.localhost'), true)
})
