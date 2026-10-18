import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import { PrismaConfigsRepository, setConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { setSearchCandidatesForTest, composeSearchForTest, resetSearchCandidatesForTest } from '@/http/controllers/@Search/routes'
import { associateSearchClick, purgeSearchObservations, recordSearchObservation, searchOpportunities, setSearchObservationDbForTest } from '@/repositories/search-observations'
import { analyticsDay } from '@/domain/analytics/day'
import { searchSessionKey } from '@/domain/search/search-observation'
const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, admin: string, owner: string, network: string, niche: string, link: string
const SECRET = 'test-jwt-secret-min-16'
beforeAll(async () => {
  setSearchObservationDbForTest(db)
  setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } })
  setLinksRepositoryForTest(new PrismaLinksRepository(db)); setConfigsRepositoryForTest(new PrismaConfigsRepository(db))
  await app.ready()
})
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); admin = randomUUID(); owner = randomUUID()
  for (const id of [tenant, foreign]) await db.tenant.create({ data: { id, host: id + '.test', name: 'F08 fixture' } })
  await db.config.createMany({ data: [{ tenantId: tenant, key: 'SEARCH_RELEVANCE_THRESHOLD', value: '0.35' }, { tenantId: tenant, key: 'SEARCH_TEXT_WEIGHT', value: '0.4' }, { tenantId: tenant, key: 'SEARCH_SEMANTIC_WEIGHT', value: '0.6' }] })
  for (const [id, role] of [[admin, 'ADMIN'], [owner, 'USER']] as const) await db.user.create({ data: { id, tenantId: tenant, name: 'Fixture', role, passwordHash: 'fixture' } })
  network = (await db.network.create({ data: { tenantId: tenant, name: 'Site', slug: 'site', knownHosts: [] } })).id
  niche = (await db.niche.create({ data: { tenantId: tenant, name: 'Estudos', slug: 'estudos' } })).id
  link = (await db.link.create({ data: { tenantId: tenant, ownerId: owner, networkId: network, nicheId: niche, name: 'Aulas de violão', description: 'Música', canonicalUrl: 'https://example.com/aulas', status: 'PUBLISHED' } })).id
  setSearchCandidatesForTest([]); composeSearchForTest({ embedding: () => ({ embed: async () => [0] }) })
})
afterAll(async () => { setSearchObservationDbForTest(null); resetSearchCandidatesForTest(); await db.$disconnect() })
function token(user = admin, jwtRole = 'ADMIN', tenantId = tenant) { return app.jwt.sign({ sub: user, tenantId, role: jwtRole, typ: 'access' }) }
function search(term = 'aulas de violão', session = randomUUID(), headers: Record<string,string> = {}) {
 return app.inject({ method: 'GET', url: '/api/v1/search?q=' + encodeURIComponent(term), headers: { host: tenant + '.test', 'user-agent': 'Mozilla/5.0 Chrome/130', cookie: 'tla_consent=marketing; analyticsSession=' + session, ...headers } })
}
function report(headers: Record<string,string> = {}, query = '') { return app.inject({ method: 'GET', url: '/api/v1/admin/search-opportunities' + query, headers: { host: tenant + '.test', authorization: 'Bearer ' + token(), ...headers } }) }
function input(session = randomUUID(), term = 'aulas de violão', now = new Date()) {
 return { tenantId: tenant, term, sessionKey: searchSessionKey(tenant, session, analyticsDay(now), SECRET), day: new Date(analyticsDay(now) + 'T00:00:00Z'), outcome: 'SUCCESS' as const, now, resultIds: [] as string[], nicheIds: [] as string[], networkIds: [] as string[] }
}
it('F08-I01/T03/T05 actual search records safe terms only after consent and excludes bots, privacy signals, tests and admins', async () => {
 const excluded: Array<Record<string,string>> = [{ cookie: '' }, { dnt: '1' }, { 'sec-gpc': '1' }, { 'x-analytics-test': '1' }, { 'user-agent': 'HeadlessChrome' }, { authorization: 'Bearer ' + token() }]
 for (const headers of excluded) expect((await search('aulas de violão', randomUUID(), headers)).statusCode).toBe(200)
 for (const term of ['contato@pessoa.test','5516992848391','cpf 12345678901','https://example.com/segredo']) expect((await search(term)).statusCode).toBe(200)
 expect(await db.searchObservation.count({ where: { tenantId: tenant } })).toBe(0)
 const session = randomUUID(), result = await search('  AULAS de violão  ', session)
 expect(result.statusCode, result.body).toBe(200); expect(result.json().queryId).toBeTruthy()
 const row = await db.searchObservation.findFirstOrThrow({ where: { tenantId: tenant } })
 expect(row.term).toBe('aulas de violão'); expect(row.sessionKey).not.toContain(session); expect(row.resultCount).toBe(0)
 expect(result.body).not.toMatch(/sessionKey|tenantId|createdAt/)
 expect((await search('aulas de violão', session)).json().queryId).toBe(result.json().queryId)
 expect(await db.searchObservation.count({ where: { tenantId: tenant } })).toBe(1)
})
it('F08-I02/T02 ten independent observations unlock a group; repeated and concurrent requests never inflate it', async () => {
 const duplicate = input(); const concurrent = await Promise.all(Array.from({ length: 5 }, () => recordSearchObservation(db, duplicate)))
 expect(new Set(concurrent)).toHaveLength(1)
 for (let i = 0; i < 8; i++) await recordSearchObservation(db, input())
 expect((await report()).json().items).toEqual([])
 await recordSearchObservation(db, input())
 const response = await report(); expect(response.statusCode, response.body).toBe(200)
 expect(response.json().items).toEqual([expect.objectContaining({ term: 'aulas de violão', searches: 10, empty: 10, exits: 0, opportunity: 'NO_RESULTS' })])
 expect((await report({}, '?page=2')).json()).toMatchObject({ total: 1, items: [] })
 expect(response.headers['cache-control']).toBe('private, no-store')
 const body = response.body; expect(body).not.toMatch(/sessionKey|resultIds|ownerId|passwordHash/)
})
it('F08-I03/T06 failures and age restrictions never become empty opportunities; capture failures do not fail search', async () => {
 composeSearchForTest({ embedding: () => ({ embed: async () => { throw new Error('provider') } }) })
 const failed = await search(); expect(failed.statusCode).toBe(503)
 expect(await db.searchObservation.findFirst({ where: { tenantId: tenant } })).toMatchObject({ outcome: 'FAILED', resultCount: null })
 setSearchCandidatesForTest([{ id: link, name: 'Aulas de violão', description: 'Música', textScore: 1, semanticScore: 1, relevance: 1, embeddingState: 'READY', searchActivatedAt: null, requiresAge: true }])
 composeSearchForTest({ embedding: () => ({ embed: async () => [0] }) })
 expect((await search()).json().ageRequired).toBe(true)
 expect(await db.searchObservation.count({ where: { tenantId: tenant, outcome: 'GATED', resultCount: null } })).toBe(1)
 expect((await report()).json().items).toEqual([])
 // A disconnected observation store must not turn a successful search into an error.
 const unavailable = new PrismaClient({ datasources: { db: { url: 'postgresql://x:x@127.0.0.1:1/x?connect_timeout=1' } } })
 setSearchObservationDbForTest(unavailable)
 try { composeSearchForTest({ embedding: () => ({ embed: async () => [0] }) }); expect((await search()).statusCode).toBe(200) } finally { setSearchObservationDbForTest(db); await unavailable.$disconnect() }
})
it('F08-I04 query association rejects foreign tenant/session/link, expired or repeated exits and excludes the owner', async () => {
 setSearchCandidatesForTest([{ id: link, name: 'Aulas de violão', description: 'Música', textScore: 1, semanticScore: 1, relevance: 1, embeddingState: 'READY', searchActivatedAt: null, requiresAge: false }])
 const session = randomUUID(), response = await search('aulas de violão', session), queryId = response.json().queryId
 expect(response.json().organic).toHaveLength(1)
 const row = await db.searchObservation.findUniqueOrThrow({ where: { id: queryId } })
 const base = { tenantId: tenant, sessionKey: row.sessionKey, queryId, linkId: link, now: new Date() }
 for (const overrides of [{ tenantId: foreign }, { sessionKey: '0'.repeat(64) }, { linkId: 'foreign-link' }]) expect((await associateSearchClick(db, { ...base, ...overrides })).count).toBe(0)
 const exit = (cookie: string, authorization?: string) => app.inject({ method: 'GET', url: '/go/' + link + '?surfaceToken=' + encodeURIComponent(response.json().organic[0].surfaceToken) + '&queryId=' + queryId, headers: { host: tenant + '.test', 'user-agent': 'Mozilla/5.0 Chrome/130', cookie, ...(authorization ? { authorization } : {}) } })
 const cookies = 'tla_consent=marketing; analyticsSession=' + session
 expect((await exit(cookies, 'Bearer ' + token(owner, 'USER'))).statusCode).toBe(302)
 expect((await db.searchObservation.findUniqueOrThrow({ where: { id: queryId } })).clickedAt).toBeNull()
 await exit('analyticsSession=' + session)
 expect((await db.searchObservation.findUniqueOrThrow({ where: { id: queryId } })).clickedAt).toBeNull()
 expect((await exit(cookies)).headers.location).toBe('https://example.com/aulas')
 expect((await db.searchObservation.findUniqueOrThrow({ where: { id: queryId } })).clickedAt).not.toBeNull()
 expect((await associateSearchClick(db, base)).count).toBe(0)
 const old = await recordSearchObservation(db, { ...input(randomUUID(), 'aulas antigas', new Date(Date.now() - 2 * 86400000)), resultIds: [link] })
 const expired = await db.searchObservation.findUniqueOrThrow({ where: { id: old! } })
 expect((await associateSearchClick(db, { ...base, queryId: old!, sessionKey: expired.sessionKey })).count).toBe(0)
})
it('F08-I05/T01 active database role, tenant and calendar filters are authoritative', async () => {
 expect((await report({ authorization: '' })).statusCode).toBe(401)
 expect((await report({ authorization: 'Bearer ' + token(owner) })).statusCode).toBe(403)
 expect((await report({ authorization: 'Bearer ' + token(admin, 'ADMIN', foreign) })).statusCode).toBe(403)
 for (const query of ['?from=2026-02-30','?from=2020-01-01','?page=0','?networkId=foreign','?extra=true']) expect((await report({}, query)).statusCode).toBe(400)
 await db.user.update({ where: { id: admin }, data: { status: 'BANNED' } }); expect((await report()).statusCode).toBe(403)
})
it('F08-I06/T04 retention excludes expired rows before the physical purge and enforces storage outcomes', async () => {
 const now = new Date(), old = new Date(now.getTime() - 181 * 86400000)
 for (let i = 0; i < 10; i++) await recordSearchObservation(db, input(randomUUID(), 'busca expirada', old))
 const reportData = await searchOpportunities(db, { tenantId: tenant, start: old, end: now, now, page: 1 }); expect(reportData.items).toEqual([])
 await purgeSearchObservations(db, now); expect(await db.searchObservation.count({ where: { tenantId: tenant } })).toBe(0)
 const { now: createdAt, ...valid } = input()
 await expect(db.searchObservation.create({ data: { ...valid, createdAt, outcome: 'FAILED', resultCount: 0 } })).rejects.toThrow()
 await expect(db.searchObservation.create({ data: { ...valid, createdAt, resultCount: null } })).rejects.toThrow()
})
it('F08-I07 caps daily terms under concurrency; facet filters and exit rates use the actual result snapshot', async () => {
 const session = randomUUID()
 for (let i = 0; i < 59; i++) await recordSearchObservation(db, input(session, 'tema ' + i))
 const last = await Promise.all(['tema sessenta', 'tema sessenta e um'].map(term => recordSearchObservation(db, input(session, term))))
 expect(last.filter(Boolean)).toHaveLength(1)
 expect(await db.searchObservation.count({ where: { tenantId: tenant } })).toBe(60)
 for (let i = 0; i < 10; i++) await recordSearchObservation(db, { ...input(), resultIds: [link], nicheIds: [niche], networkIds: [network] })
 const response = await report({}, '?networkId=' + network + '&nicheId=' + niche)
 expect(response.json().items).toEqual([expect.objectContaining({ searches: 10, empty: 0, withResults: 10, exitRate: 0, opportunity: 'LOW_INTERACTION' })])
 expect((await report({}, '?opportunity=NO_RESULTS&networkId=' + network)).json().items).toEqual([])
 expect((await report({}, '?opportunity=LOW_INTERACTION&networkId=' + network)).json().items).toHaveLength(1)
 const partial = await db.searchObservation.findFirstOrThrow({ where: { tenantId: tenant, networkIds: { has: network } } })
 await db.searchObservation.update({ where: { id: partial.id }, data: { networkIds: [] } })
 expect((await report({}, '?networkId=' + network)).json().items).toEqual([])
})
