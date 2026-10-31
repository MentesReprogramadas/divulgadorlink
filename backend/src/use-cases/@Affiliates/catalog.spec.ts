import { createHash } from 'node:crypto'
import type { AffiliateConnection, PrismaClient } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { openWebhookSecret, sealWebhookSecret } from '@/lib/webhook-secret'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { affiliateCatalogAccessToken, affiliateCatalogStatus, affiliateGenerationProviders, configureAffiliateCatalog, connectAffiliateCatalog, disconnectAffiliateCatalog, finishAffiliateCatalogAuthorization, refreshAffiliateCatalogProduct } from './catalog'

const provider = vi.hoisted(() => ({ exchange: vi.fn(),request:vi.fn<(path:string)=>Promise<unknown>>() }))
vi.mock('@/adapters/affiliates/mercado-livre', async importOriginal => ({ ...await importOriginal<typeof import('@/adapters/affiliates/mercado-livre')>(), exchangeMercadoLivreToken: provider.exchange,mercadoLivreRequest:provider.request }))

const tenantId = 'catalog-tenant', actorId = 'catalog-admin', encryptionKey = Buffer.alloc(32, 8).toString('base64')
const cipherContext = `affiliates:${tenantId}:MERCADO_LIVRE`
const originalKey = env.WEBHOOK_ENCRYPTION_KEY

function fixture(status = 'CONFIGURED', secret = { clientId: '123456', clientSecret: 'super-secret', accessToken: 'access-OLD', refreshToken: 'refresh-OLD', expiresAt: Date.now() - 1000 }) {
  let row: AffiliateConnection | null = { id: 'connection-id', tenantId, provider: 'MERCADO_LIVRE', credentials: sealWebhookSecret(JSON.stringify(secret), encryptionKey, cipherContext), status, oauthState: null, oauthVerifier: null, oauthExpiresAt: null, updatedAt: new Date('2026-10-28T00:00:00.000Z') }
  const read = vi.fn(async (input: { where: { tenantId_provider: { provider: string } } }) => input.where.tenantId_provider.provider === 'MERCADO_LIVRE' && row ? { ...row } : null)
  const updateMany = vi.fn(async (input: { where: Record<string, unknown>; data: Partial<AffiliateConnection> }) => {
    if (!row || Object.entries(input.where).some(([key, value]) => key === 'oauthExpiresAt' ? !row?.oauthExpiresAt || row.oauthExpiresAt <= (value as { gt: Date }).gt : key === 'updatedAt' ? row?.updatedAt.getTime() !== (value as Date).getTime() : row?.[key as keyof AffiliateConnection] !== value)) return { count: 0 }
    row = { ...row, ...input.data, updatedAt: input.data.updatedAt ?? new Date() }
    return { count: 1 }
  })
  const update = vi.fn(async (input: { data: Partial<AffiliateConnection> }) => { row = { ...row!, ...input.data, updatedAt: new Date() }; return row })
  const upsert = vi.fn(async (input: { create: Partial<AffiliateConnection>; update: Partial<AffiliateConnection> }) => { row = { ...row!, ...(row ? input.update : input.create), updatedAt: new Date() }; return row })
  const audit = vi.fn(async () => ({}))
  const raw = vi.fn(async () => [])
  const tx = { affiliateConnection: { findUnique: read, updateMany, update, upsert }, auditLog: { create: audit }, $queryRaw: raw }
  const db = { ...tx, $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) } as unknown as PrismaClient
  return { db, read, updateMany, update, audit, raw, row: () => row!, replace: (value: AffiliateConnection | null) => { row = value } }
}

beforeEach(() => { env.WEBHOOK_ENCRYPTION_KEY = encryptionKey; provider.exchange.mockReset();provider.request.mockReset() })
afterEach(() => { env.WEBHOOK_ENCRYPTION_KEY = originalKey; vi.unstubAllEnvs() })

describe('Mercado Livre connection lifecycle', () => {
  it('exclui da agenda fontes desconectadas e credenciais inválidas sem acessar serviços externos',async()=>{
    const read=vi.fn(async()=>({status:'DISCONNECTED',credentials:'',updatedAt:new Date()}))
    const client={affiliateConnection:{findUnique:read}} as unknown as PrismaClient
    expect(await affiliateGenerationProviders(client,tenantId)).toEqual({MERCADO_LIVRE:false,SHOPEE:false})
    read.mockResolvedValue({status:'CONFIGURED',credentials:'invalid-ciphertext',updatedAt:new Date()})
    expect(await affiliateGenerationProviders(client,tenantId)).toEqual({MERCADO_LIVRE:false,SHOPEE:false})
    expect(provider.request).not.toHaveBeenCalled()
  })
  it('revalidação não transforma falhas de autorização/permissão/limite em reputação desconhecida',async()=>{
    const state=fixture('CONNECTED',{clientId:'123456',clientSecret:'test-secret',accessToken:'test-access',refreshToken:'test-refresh',expiresAt:Date.now()+3600000})
    const product={id:'MLB100',catalogId:'MLB200',sellerId:'123',title:'Produto',productUrl:'https://produto.mercadolivre.com.br/MLB-100-_JM',priceCents:1000,oldPriceCents:null,imageUrl:null,checkedAt:new Date().toISOString()}
    for(const status of [401,403,409,413,429,502]) {
      provider.request.mockImplementation(async path=>{if(path.startsWith('/products/'))return {results:[{item_id:'MLB100',seller_id:123,price:10,currency_id:'BRL',condition:'new'}],paging:{total:1}};throw new AffiliateCatalogError(status,'Falha de consulta')})
      if(status===502)expect((await refreshAffiliateCatalogProduct(state.db,tenantId,product)).reputation).toEqual({level:null,status:'UNKNOWN'})
      else await expect(refreshAffiliateCatalogProduct(state.db,tenantId,product)).rejects.toMatchObject({status})
    }
  })
  it('persists encrypted client configuration and audits without secrets', async () => {
    const state = fixture()
    await configureAffiliateCatalog(state.db, tenantId, actorId, { clientId: '654321', clientSecret: 'changed-secret' })
    expect(state.row().credentials).not.toContain('changed-secret')
    expect(JSON.parse(openWebhookSecret(state.row().credentials, encryptionKey, cipherContext))).toEqual({ clientId: '654321', clientSecret: 'changed-secret' })
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId, action: 'affiliate.catalog.configure', after: { provider: 'MERCADO_LIVRE' } }) }))
    expect(JSON.stringify(await affiliateCatalogStatus(state.db, tenantId))).not.toMatch(/changed-secret|access-OLD|refresh-OLD/)
  })

  it('generates PKCE S256 and binds the one-use state to the initiating administrator', async () => {
    const state = fixture()
    const { url } = await connectAffiliateCatalog(state.db, tenantId, actorId)
    const parsed = new URL(url), publicState = parsed.searchParams.get('state')!, verifier = openWebhookSecret(state.row().oauthVerifier!, encryptionKey, `${cipherContext}:oauth`)
    expect(parsed.origin).toBe('https://auth.mercadolivre.com.br')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('code_challenge')).toBe(createHash('sha256').update(verifier).digest('base64url'))
    expect(state.row().oauthState).toBe(createHash('sha256').update(`${actorId}:${publicState}`).digest('hex'))
    expect(state.row().oauthExpiresAt!.getTime() - Date.now()).toBeGreaterThan(599000)
    await expect(finishAffiliateCatalogAuthorization(state.db, tenantId, 'another-admin', { state: publicState, code: 'code' })).rejects.toMatchObject({ status: 409 })
    expect(provider.exchange).not.toHaveBeenCalled()
  })

  it('consumes state before exchange and refuses callback replay', async () => {
    const state = fixture(), authorization = await connectAffiliateCatalog(state.db, tenantId, actorId)
    const input = { state: new URL(authorization.url).searchParams.get('state')!, code: 'code' }
    provider.exchange.mockImplementation(async () => {
      expect(state.row().oauthState).toBeNull()
      return { access_token: 'NEW', refresh_token: 'ROTATED', expires_in: 21600, user_id: 123 }
    })
    await finishAffiliateCatalogAuthorization(state.db, tenantId, actorId, input)
    expect(state.row().status).toBe('CONNECTED')
    await expect(finishAffiliateCatalogAuthorization(state.db, tenantId, actorId, input)).rejects.toMatchObject({ status: 409 })
    expect(provider.exchange).toHaveBeenCalledOnce()
  })

  it('does not restore tokens after disconnect races with a callback exchange', async () => {
    const state = fixture(), authorization = await connectAffiliateCatalog(state.db, tenantId, actorId)
    const input = { state: new URL(authorization.url).searchParams.get('state')!, code: 'code' }
    provider.exchange.mockImplementation(async () => {
      await disconnectAffiliateCatalog(state.db, tenantId, actorId)
      return { access_token: 'NEW', refresh_token: 'ROTATED', expires_in: 21600 }
    })
    await expect(finishAffiliateCatalogAuthorization(state.db, tenantId, actorId, input)).rejects.toMatchObject({ status: 409 })
    expect(state.row().status).toBe('CONFIGURED')
    expect(JSON.parse(openWebhookSecret(state.row().credentials, encryptionKey, cipherContext)).accessToken).toBeUndefined()
  })

  it('requires a valid current state, not just a successful provider authorization code', async () => {
    const state = fixture(), authorization = await connectAffiliateCatalog(state.db, tenantId, actorId)
    state.replace({ ...state.row(), oauthExpiresAt: new Date(Date.now() - 1) })
    await expect(finishAffiliateCatalogAuthorization(state.db, tenantId, actorId, { state: new URL(authorization.url).searchParams.get('state')!, code: 'code' })).rejects.toMatchObject({ status: 409 })
    expect(provider.exchange).not.toHaveBeenCalled()
  })

  it('locks before reading the latest refresh token and stores the rotated token', async () => {
    const state = fixture('CONNECTED')
    provider.exchange.mockResolvedValue({ access_token: 'NEW', refresh_token: 'ROTATED', expires_in: 21600 })
    expect(await affiliateCatalogAccessToken(state.db, tenantId)).toBe('NEW')
    expect(state.raw.mock.invocationCallOrder[0]).toBeLessThan(state.read.mock.invocationCallOrder[0]!)
    expect(provider.exchange).toHaveBeenCalledWith(expect.objectContaining({ refresh_token: 'refresh-OLD' }))
    expect(JSON.parse(openWebhookSecret(state.row().credentials, encryptionKey, cipherContext)).refreshToken).toBe('ROTATED')
    expect(await affiliateCatalogAccessToken(state.db, tenantId)).toBe('NEW')
    expect(provider.exchange).toHaveBeenCalledOnce()
  })

  it('persists reconnect after invalid grant, but preserves connection after transient failure', async () => {
    for (const status of [409, 502]) {
      const state = fixture('CONNECTED')
      provider.exchange.mockRejectedValueOnce(new AffiliateCatalogError(status, 'safe message'))
      await expect(affiliateCatalogAccessToken(state.db, tenantId)).rejects.toMatchObject({ status })
      expect(state.row().status).toBe(status === 409 ? 'RECONNECT' : 'CONNECTED')
    }
  })

  it('never silently decrypts credentials belonging to a different tenant', async () => {
    const state = fixture('CONNECTED')
    state.replace({ ...state.row(), tenantId: 'different-tenant' })
    await expect(affiliateCatalogAccessToken(state.db, tenantId)).rejects.toMatchObject({ status: 503 })
    expect(provider.exchange).not.toHaveBeenCalled()
  })
})
