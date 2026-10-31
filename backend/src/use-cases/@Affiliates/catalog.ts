import { createHash, randomBytes } from 'node:crypto'
import type { AffiliateConnection, Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { env } from '@/env'
import { openWebhookSecret, sealWebhookSecret } from '@/lib/webhook-secret'
import { affiliateSellerUrl, affiliateSessionSchema, AffiliateCatalogError, catalogItem, type CatalogProduct } from '@/domain/affiliates/mercado-livre'
import { affiliateGeneratorConfigured, exchangeMercadoLivreToken, generateAffiliateLink, generateSessionAffiliateLink, mercadoLivreRequest, searchMercadoLivreCatalog, type MercadoLivreTokens, sellers, parseSellerReputation } from '@/adapters/affiliates/mercado-livre'
import { affiliateCatalogGatewayEnabled, affiliateCatalogGatewayRequest, affiliateCatalogGatewayRequests, affiliateCatalogGatewayStatus } from '@/adapters/affiliates/catalog-gateway'
import { isShopeeProduct, type AffiliateCatalogProvider } from '@/domain/affiliates/shopee'
import { refreshShopeeCatalogProduct, searchShopeeCatalog } from '@/adapters/affiliates/shopee'
import { generateTenantShopeeAffiliate, shopeeConnection } from '@/use-cases/affiliates/shopee'

const PROVIDER = 'MERCADO_LIVRE'
const credentialsSchema = z.object({ clientId: z.string(), clientSecret: z.string(), accessToken: z.string().optional(), refreshToken: z.string().optional(), expiresAt: z.number().optional(), accountId: z.string().optional() })
type Credentials = z.infer<typeof credentialsSchema>
const context = (tenantId: string) => `affiliates:${tenantId}:${PROVIDER}`
const generatorSettings = () => ({ url: process.env.AFFILIATE_SERVICE_URL, key: process.env.AFFILIATE_SERVICE_KEY, tag: process.env.AFFILIATE_TAG, profile: process.env.AFFILIATE_PROFILE })
const connectionWhere = (tenantId: string) => ({ tenantId_provider: { tenantId, provider: PROVIDER } })
const stateHash = (actorId: string, state: string) => createHash('sha256').update(`${actorId}:${state}`).digest('hex')
const seal = (tenantId: string, data: Credentials) => sealWebhookSecret(JSON.stringify(data), env.WEBHOOK_ENCRYPTION_KEY, context(tenantId))
const gatewaySettings = () => ({ url: env.AFFILIATE_CATALOG_GATEWAY_URL, key: env.AFFILIATE_CATALOG_GATEWAY_KEY })

async function requireGatewayTenant(db: PrismaClient, tenantId: string) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { host: true } })
  if (!tenant || tenant.host !== env.TENANT_HOST) throw new AffiliateCatalogError(403, 'O catálogo central está disponível apenas para a operação administrativa deste site.')
}

function credentials(row: AffiliateConnection): Credentials {
  try { return credentialsSchema.parse(JSON.parse(openWebhookSecret(row.credentials, env.WEBHOOK_ENCRYPTION_KEY, context(row.tenantId)))) } catch { throw new AffiliateCatalogError(503, 'A conexão precisa ser configurada novamente com a proteção correta no servidor.') }
}

export function mercadoLivreRedirectUri(): string {
  let url: URL
  try { url = new URL(process.env.MERCADO_LIVRE_REDIRECT_URI || `${env.APP_PUBLIC_URL || 'http://localhost:3000'}/bff/v1/admin/affiliates/catalog/callback`) } catch { throw new AffiliateCatalogError(503, 'Configure a URL de retorno do Mercado Livre no servidor.') }
  if ((url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.hash || url.search) throw new AffiliateCatalogError(503, 'A URL de retorno do Mercado Livre precisa usar HTTPS.')
  return url.href
}

export const SESSION_PROVIDER = 'MERCADO_LIVRE_SESSION'
const sessionWhere = (tenantId: string) => ({ tenantId_provider: { tenantId, provider: SESSION_PROVIDER } })
const sessionContext = (tenantId: string) => `affiliates:${tenantId}:${SESSION_PROVIDER}`
function sessionCredentials(row: AffiliateConnection) {
  try { return affiliateSessionSchema.parse(JSON.parse(openWebhookSecret(row.credentials, env.WEBHOOK_ENCRYPTION_KEY, sessionContext(row.tenantId)))) } catch { throw new AffiliateCatalogError(503, 'Configure novamente a sessão de afiliado com a proteção correta no servidor.') }
}
async function sessionStatus(db: PrismaClient, tenantId: string) {
  const row = await db.affiliateConnection.findUnique({ where: sessionWhere(tenantId) })
  if (row) {
    if (row.status === 'DISCONNECTED') return { mode: 'DISCONNECTED' as const, configured: false, verified: false, status: row.status, accountLabel: '', tag: '', profile: '', updatedAt: row.updatedAt.toISOString() }
    const value = sessionCredentials(row)
    return { mode: 'OWN' as const, configured: true, verified: row.status === 'CONNECTED', status: row.status, accountLabel: value.accountLabel, tag: value.tag, profile: value.profile, updatedAt: row.updatedAt.toISOString() }
  }
  const settings = generatorSettings()
  const tenant = await db.tenant?.findUnique({ where: { id: tenantId }, select: { host: true } })
  const allowed = tenant?.host === env.TENANT_HOST
  return { mode: 'CENTRAL' as const, configured: allowed && affiliateGeneratorConfigured(settings), verified: false, status: 'NOT_CONFIGURED', accountLabel: '', tag: allowed ? settings.tag ?? '' : '', profile: allowed ? settings.profile ?? '' : '' }
}
export async function affiliateGenerationProviders(db:PrismaClient,tenantId:string){
  const session=await sessionStatus(db,tenantId).catch(()=>null)
  const shopee=await shopeeConnection(db,tenantId).then(()=>true).catch(()=>false)
  return {MERCADO_LIVRE:!!session?.configured&&session.status!=='RECONNECT',SHOPEE:shopee}
}
export async function affiliateCatalogStatus(db: PrismaClient, tenantId: string) {
  const session = await sessionStatus(db, tenantId)
  const shared = { session, affiliateConfigured: session.configured && session.status !== 'RECONNECT', affiliateTag: session.tag, affiliateProfile: session.profile }
  const row = await db.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
  const gateway = gatewaySettings()
  if (!row && affiliateCatalogGatewayEnabled(gateway)) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { host: true } })
    if (!tenant || tenant.host !== env.TENANT_HOST) return { mode: 'NATIVE' as const, configured: false, connected: false, status: 'NOT_CONFIGURED', clientId: '', accountId: '', redirectUri: mercadoLivreRedirectUri(), ...shared }
    try {
      const { configured, connected, status, clientId, expiresAt } = await affiliateCatalogGatewayStatus(gateway)
      return { mode: 'CENTRAL' as const, configured, connected, status, clientId: clientId ?? '', accountId: '', ...(expiresAt ? { expiresAt } : {}), redirectUri: mercadoLivreRedirectUri(), ...shared }
    } catch (error) {
      if (!(error instanceof AffiliateCatalogError)) throw error
      return { mode: 'CENTRAL' as const, configured: false, connected: false, status: 'UNAVAILABLE', clientId: '', accountId: '', redirectUri: mercadoLivreRedirectUri(), catalogError: error.message, ...shared }
    }
  }
  const stored = row ? credentials(row) : null
  return { mode: 'NATIVE' as const, configured: Boolean(stored?.clientId), connected: row?.status === 'CONNECTED', status: row?.status ?? 'NOT_CONFIGURED', clientId: stored?.clientId ?? '', accountId: stored?.accountId ?? '', redirectUri: mercadoLivreRedirectUri(), ...shared }
}
export async function configureAffiliateSession(db: PrismaClient, tenantId: string, actorId: string, input: z.infer<typeof affiliateSessionSchema>) {
  const value = affiliateSessionSchema.parse(input)
  const encrypted = sealWebhookSecret(JSON.stringify(value), env.WEBHOOK_ENCRYPTION_KEY, sessionContext(tenantId))
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.affiliateConnection.upsert({ where: sessionWhere(tenantId), create: { tenantId, provider: SESSION_PROVIDER, credentials: encrypted, status: 'CONFIGURED' }, update: { credentials: encrypted, status: 'CONFIGURED' } })
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.session.configure', entityType: 'AffiliateConnection', entityId: tenantId, after: { provider: SESSION_PROVIDER } } })
  })
  return { saved: true, verified: false }
}
export async function disconnectAffiliateSession(db: PrismaClient, tenantId: string, actorId: string) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.affiliateConnection.upsert({ where: sessionWhere(tenantId), create: { tenantId, provider: SESSION_PROVIDER, credentials: '', status: 'DISCONNECTED' }, update: { credentials: '', status: 'DISCONNECTED' } })
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.session.disconnect', entityType: 'AffiliateConnection', entityId: tenantId, after: { provider: SESSION_PROVIDER } } })
  })
  return { disconnected: true }
}

export const catalogConfigSchema = z.object({ clientId: z.string().regex(/^\d{4,32}$/), clientSecret: z.string().min(8).max(512) }).strict()
export async function configureAffiliateCatalog(db: PrismaClient, tenantId: string, actorId: string, input: z.infer<typeof catalogConfigSchema>) {
  const value = catalogConfigSchema.parse(input), encrypted = seal(tenantId, value)
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.affiliateConnection.upsert({ where: connectionWhere(tenantId), create: { tenantId, provider: PROVIDER, credentials: encrypted, status: 'CONFIGURED' }, update: { credentials: encrypted, status: 'CONFIGURED', oauthState: null, oauthVerifier: null, oauthExpiresAt: null } })
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.catalog.configure', entityType: 'AffiliateConnection', entityId: tenantId, after: { provider: PROVIDER } } })
  })
  return { saved: true }
}

export async function connectAffiliateCatalog(db: PrismaClient, tenantId: string, actorId: string) {
  const row = await db.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
  if (!row) throw new AffiliateCatalogError(409, 'Configure o aplicativo do Mercado Livre antes de conectar a conta.')
  const stored = credentials(row)
  if (!stored.clientId || !stored.clientSecret) throw new AffiliateCatalogError(409, 'Configure o aplicativo do Mercado Livre antes de conectar a conta.')
  const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url')
  const redirectUri = mercadoLivreRedirectUri()
  const changed = await db.affiliateConnection.updateMany({ where: { id: row.id, tenantId, credentials: row.credentials, updatedAt: row.updatedAt }, data: { oauthState: stateHash(actorId, state), oauthVerifier: sealWebhookSecret(verifier, env.WEBHOOK_ENCRYPTION_KEY, `${context(tenantId)}:oauth`), oauthExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } })
  if (!changed.count) throw new AffiliateCatalogError(409, 'A configuração mudou. Atualize a página antes de conectar.')
  const url = new URL('https://auth.mercadolivre.com.br/authorization')
  for (const [name, value] of Object.entries({ response_type: 'code', client_id: stored.clientId, redirect_uri: redirectUri, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', scope: 'read offline_access' })) url.searchParams.set(name, value)
  return { url: url.href }
}

function tokenCredentials(stored: Credentials, tokens: MercadoLivreTokens): Credentials {
  return { ...stored, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000, accountId: tokens.user_id === undefined ? stored.accountId : String(tokens.user_id) }
}

export const catalogCallbackSchema = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: z.string().min(1).max(2000) }).strict()
export async function finishAffiliateCatalogAuthorization(db: PrismaClient, tenantId: string, actorId: string, input: z.infer<typeof catalogCallbackSchema>) {
  const value = catalogCallbackSchema.parse(input), expectedState = stateHash(actorId, value.state)
  const row = await db.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
  if (!row?.oauthVerifier || row.oauthState !== expectedState || !row.oauthExpiresAt || row.oauthExpiresAt <= new Date()) throw new AffiliateCatalogError(409, 'A solicitação de conexão expirou ou já foi usada. Conecte o Mercado Livre novamente.')
  const stored = credentials(row)
  const verifier = openWebhookSecret(row.oauthVerifier, env.WEBHOOK_ENCRYPTION_KEY, `${context(tenantId)}:oauth`)
  const claimedAt = new Date()
  // Consume before the external exchange: callback retries must never reuse an authorization code.
  const claimed = await db.affiliateConnection.updateMany({ where: { id: row.id, tenantId, credentials: row.credentials, oauthState: expectedState, oauthExpiresAt: { gt: claimedAt }, updatedAt: row.updatedAt }, data: { oauthState: null, oauthVerifier: null, oauthExpiresAt: null, updatedAt: claimedAt } })
  if (!claimed.count) throw new AffiliateCatalogError(409, 'A solicitação de conexão já foi usada ou alterada. Conecte novamente.')
  const tokens = await exchangeMercadoLivreToken({ grant_type: 'authorization_code', client_id: stored.clientId, client_secret: stored.clientSecret, code: value.code, code_verifier: verifier, redirect_uri: mercadoLivreRedirectUri() })
  await db.$transaction(async tx => {
    const saved = await tx.affiliateConnection.updateMany({ where: { id: row.id, tenantId, credentials: row.credentials, updatedAt: claimedAt, oauthState: null }, data: { credentials: seal(tenantId, tokenCredentials(stored, tokens)), status: 'CONNECTED' } })
    if (!saved.count) throw new AffiliateCatalogError(409, 'A configuração mudou durante a autorização. Conecte novamente.')
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.catalog.connect', entityType: 'AffiliateConnection', entityId: row.id, after: { provider: PROVIDER } } })
  })
  return { connected: true }
}

async function refreshToken(tx: Prisma.TransactionClient, tenantId: string): Promise<string | AffiliateCatalogError> {
  // Lock the current row, then read it: another process may have just rotated the refresh token.
  await tx.$queryRaw`SELECT id FROM affiliate_connections WHERE "tenantId" = ${tenantId} AND provider = ${PROVIDER} FOR UPDATE`
  const row = await tx.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
  if (!row || row.status !== 'CONNECTED') return new AffiliateCatalogError(409, 'Conecte a conta do Mercado Livre para buscar produtos.')
  const stored = credentials(row)
  if (stored.accessToken && stored.expiresAt && stored.expiresAt > Date.now() + 60000) return stored.accessToken
  if (!stored.refreshToken) return new AffiliateCatalogError(409, 'A conexão do Mercado Livre precisa ser autorizada novamente.')
  try {
    const tokens = await exchangeMercadoLivreToken({ grant_type: 'refresh_token', client_id: stored.clientId, client_secret: stored.clientSecret, refresh_token: stored.refreshToken })
    await tx.affiliateConnection.update({ where: { id: row.id }, data: { credentials: seal(tenantId, tokenCredentials(stored, tokens)), status: 'CONNECTED' } })
    return tokens.access_token
  } catch (error) {
    if (!(error instanceof AffiliateCatalogError)) throw error
    if (error.status === 409) await tx.affiliateConnection.update({ where: { id: row.id }, data: { status: 'RECONNECT' } })
    return error
  }
}

export async function affiliateCatalogAccessToken(db: PrismaClient, tenantId: string): Promise<string> {
  const token = await db.$transaction(tx => refreshToken(tx, tenantId), { timeout: 25000, maxWait: 3000 })
  if (token instanceof AffiliateCatalogError) throw token
  return token
}

export async function searchAffiliateCatalog(db: PrismaClient, tenantId: string, term: string, options?: { offset?: number; provider?: AffiliateCatalogProvider }) {
  if (options?.provider === 'SHOPEE') return searchShopeeCatalog(term, (await shopeeConnection(db, tenantId)).request, options)
  const gateway = gatewaySettings()
  const native = await db.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
  if (!native && affiliateCatalogGatewayEnabled(gateway)) {
    await requireGatewayTenant(db, tenantId)
    return searchMercadoLivreCatalog(term, path => affiliateCatalogGatewayRequest(gateway, path), affiliateCatalogGatewayRequests(gateway), options)
  }
  const token = await affiliateCatalogAccessToken(db, tenantId)
  try { return await searchMercadoLivreCatalog(term, path => mercadoLivreRequest(path, token), undefined, options) } catch (error) {
    if (error instanceof AffiliateCatalogError && error.status === 401) {
      const current = await db.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
      if (current && credentials(current).accessToken === token) await db.affiliateConnection.updateMany({ where: { id: current.id, tenantId, credentials: current.credentials, status: 'CONNECTED' }, data: { status: 'RECONNECT' } })
      throw new AffiliateCatalogError(409, 'A autorização do Mercado Livre expirou. Conecte a conta novamente.')
    }
    throw error
  }
}

export async function generateCatalogAffiliate(db: PrismaClient, tenantId: string, actorId: string, productUrl: string) {
  if (URL.canParse(productUrl) && ['shopee.com.br','www.shopee.com.br'].includes(new URL(productUrl).hostname)) return generateTenantShopeeAffiliate(db, tenantId, actorId, productUrl)
  const row = await db.affiliateConnection.findUnique({ where: sessionWhere(tenantId) })
  if (row && !['CONFIGURED', 'CONNECTED'].includes(row.status)) throw new AffiliateCatalogError(409, 'Configure a sessão de afiliado antes de gerar links.')
  if (!row) await requireGatewayTenant(db, tenantId)
  const product = affiliateSellerUrl(productUrl)
  let result
  try { result = row ? await generateSessionAffiliateLink(product.href, sessionCredentials(row)) : await generateAffiliateLink(product.href, generatorSettings()) } catch (error) {
    if (row && error instanceof AffiliateCatalogError && error.status === 401) {
      await db.affiliateConnection.updateMany({ where: { id: row.id, tenantId, credentials: row.credentials, updatedAt: row.updatedAt }, data: { status: 'RECONNECT' } })
      throw new AffiliateCatalogError(409, error.message)
    }
    throw error
  }
  await db.$transaction(async tx => {
    if (row) {
      const changed = await tx.affiliateConnection.updateMany({ where: { id: row.id, tenantId, credentials: row.credentials, updatedAt: row.updatedAt, status: row.status }, data: { status: 'CONNECTED' } })
      if (!changed.count) throw new AffiliateCatalogError(409, 'A sessão mudou durante a geração. Gere novamente com a sessão atual.')
    } else {
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
      if (await tx.affiliateConnection.findUnique({ where: sessionWhere(tenantId) })) throw new AffiliateCatalogError(409, 'A sessão mudou durante a geração. Gere novamente com a sessão atual.')
    }
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.link.generate', entityType: 'AffiliateConnection', entityId: tenantId, after: { provider: row ? SESSION_PROVIDER : PROVIDER } } })
  })
  return result
}

export async function disconnectAffiliateCatalog(db: PrismaClient, tenantId: string, actorId: string) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    const row = await tx.affiliateConnection.findUnique({ where: connectionWhere(tenantId) })
    if (!row) {
      await tx.affiliateConnection.create({ data: { tenantId, provider: PROVIDER, credentials: seal(tenantId, { clientId: '', clientSecret: '' }), status: 'CONFIGURED' } })
    } else {
      const { clientId, clientSecret } = credentials(row)
      await tx.affiliateConnection.update({ where: { id: row.id }, data: { credentials: seal(tenantId, { clientId, clientSecret }), status: 'CONFIGURED', oauthState: null, oauthVerifier: null, oauthExpiresAt: null } })
    }
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.catalog.disconnect', entityType: 'AffiliateConnection', entityId: row?.id ?? tenantId, after: { provider: PROVIDER } } })
  })
  return { disconnected: true }
}

// Exact-item revalidation never substitutes another seller's cheaper listing.
export async function refreshAffiliateCatalogProduct(db:PrismaClient,tenantId:string,product:CatalogProduct):Promise<CatalogProduct> {
  if (isShopeeProduct(product.id)) return refreshShopeeCatalogProduct(product, (await shopeeConnection(db, tenantId)).request)
  const gateway=gatewaySettings(),native=await db.affiliateConnection.findUnique({where:connectionWhere(tenantId)})
  let request:(path:string)=>Promise<unknown>
  if(!native && affiliateCatalogGatewayEnabled(gateway)) { await requireGatewayTenant(db,tenantId);request=path=>affiliateCatalogGatewayRequest(gateway,path) }
  else { const token=await affiliateCatalogAccessToken(db,tenantId); request=path=>mercadoLivreRequest(path,token) }
  const rows=await sellers(product.catalogId,request,Date.now()+60000)
  const raw=rows.find(row=>z.object({item_id:z.literal(product.id)}).safeParse(row).success)
  const fresh=catalogItem({id:product.catalogId,name:product.title,pictures:product.imageUrl?[{url:product.imageUrl}]:[]},raw)
  if(!fresh) throw new AffiliateCatalogError(409,'O anúncio não está mais disponível com preço verificável. Atualize os produtos.')
  if(product.sellerId && fresh.sellerId!==product.sellerId)throw new AffiliateCatalogError(409,'O vendedor mudou. Atualize os produtos antes de enviar.')
  try {fresh.reputation=fresh.sellerId?parseSellerReputation(await request(`/users/${fresh.sellerId}`)):{level:null,status:'UNKNOWN'}}catch(error) {
    if(error instanceof AffiliateCatalogError && [401,403,409,413,429].includes(error.status))throw error
    fresh.reputation={level:null,status:'UNKNOWN'}
  }
  return fresh
}
