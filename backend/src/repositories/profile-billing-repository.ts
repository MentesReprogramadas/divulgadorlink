import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient, type ProfilePlanVersion } from '@prisma/client'
import { BillingError, type billingCheckoutInput, type billingPlanInput, type billingSettingsInput } from '@/domain/billing/billing-input'
import { BASE_PROFILE_CAPABILITIES, PROFILE_CAPABILITIES, hostedBillingUrl, profileSaleBlock, type ProfileCapability, type ProfilePlanInput, type ProfileTier } from '@/domain/billing/profile-plans'
import type { BillingGateway } from '@/domain/billing/billing-gateway'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import type { z } from 'zod'
import { coveredProfileCapabilities } from './profile-capability-coverage'

export type BillingActor = { tenantId: string; ownerId: string }
export type BillingRuntime = { enabled: boolean; production: boolean; gateway: BillingGateway | null; webhookReady: boolean; delivered: ReadonlySet<ProfileCapability> }
export const BILLING_OPEN_STATES = ['PENDING','ACTIVE','PAST_DUE','UNPAID','INCOMPLETE','REVIEW']
export const PROFILE_TIER_LABELS = { FREE: 'Gratuito', PRO: 'Pro', PREMIUM: 'Premium' } as const
export const PROFILE_CAPABILITY_LABELS: Record<ProfileCapability, string> = {
  'profile.page': 'Sua página de links', 'profile.categories': 'Grupos e categorias',
  'profile.appearance': 'Cores, botões e foto', 'profile.history': 'Prévia e histórico',
  'profile.analytics': 'Estatísticas dos botões', 'profile.scheduling': 'Agendamento dos links',
  'profile.richBlocks': 'Blocos de conteúdo', 'profile.subdomain': 'Subdomínio próprio',
}
function tier(input: string): ProfileTier {
  if (input === 'FREE' || input === 'PRO' || input === 'PREMIUM') return input
  throw new BillingError(503, 'Plano indisponível.')
}
export function knownProfileCapabilities(input: readonly string[]): ProfileCapability[] {
  return PROFILE_CAPABILITIES.filter(key => input.includes(key))
}
function planInput(row: ProfilePlanVersion, planTier: string): ProfilePlanInput {
  return { tier: tier(planTier), amountCents: row.amountCents, currency: row.currency, interval: row.interval, providerPriceId: row.providerPriceId, capabilities: knownProfileCapabilities(row.capabilities) }
}
export async function requireBillingActor(db: Prisma.TransactionClient, actor: BillingActor, action: 'READ' | 'PURCHASE' | 'ADMIN' | 'CANCEL' = 'READ') {
  const user = await db.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId }, include: { identifiers: true } })
  if (!user || user.status !== 'ACTIVE' || (action === 'ADMIN' && user.role !== 'ADMIN')) throw new BillingError(403, 'Acesso negado.')
  if (action === 'PURCHASE' && !canSubmitLinkFromIdentifiers(user.status, user.identifiers)) throw new BillingError(403, 'Confirme sua conta antes de assinar.')
  return user
}
export async function withBillingActor<T>(db: PrismaClient, actor: BillingActor, action: 'READ' | 'PURCHASE' | 'ADMIN' | 'CANCEL', work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    await tx.$queryRawUnsafe('SELECT id FROM users WHERE id=$1 AND "tenantId"=$2 FOR UPDATE', actor.ownerId, actor.tenantId)
    await requireBillingActor(tx, actor, action)
    return work(tx)
  })
}
export async function billingCatalog(db: Prisma.TransactionClient, tenantId: string, runtime: BillingRuntime) {
  const [settings, plans] = await Promise.all([
    db.profileBillingSettings.findUnique({ where: { tenantId } }),
    db.profilePlan.findMany({ where: { tenantId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } }),
  ])
  const free = { tier: 'FREE' as const, title: PROFILE_TIER_LABELS.FREE, versionId: null, amountCents: 0, currency: 'BRL', interval: 'month', available: true, capabilities: BASE_PROFILE_CAPABILITIES.map(key => ({ key, label: PROFILE_CAPABILITY_LABELS[key], delivered: true })) }
  return [free, ...(['PRO','PREMIUM'] as const).map(code => {
    const plan = plans.find(row => row.tier === code), version = plan?.versions[0]
    const proposed: ProfileCapability[] = code === 'PRO' ? [...BASE_PROFILE_CAPABILITIES,'profile.analytics','profile.scheduling'] : [...PROFILE_CAPABILITIES]
    const keys = version ? knownProfileCapabilities(version.capabilities) : proposed
    const available = Boolean(plan?.enabled && version && version.livemode === settings?.livemode && profileSaleBlock(planInput(version, code), {
      enabled: runtime.enabled && Boolean(settings?.enabled), providerConfigured: Boolean(runtime.gateway && runtime.webhookReady && runtime.gateway.livemode === settings?.livemode),
      fiscalReviewed: Boolean(settings?.fiscalReviewed), deliveredCapabilities: runtime.delivered,
    }) === null)
    return { tier: code, title: PROFILE_TIER_LABELS[code], versionId: version?.id ?? null, amountCents: version?.amountCents ?? null, currency: 'BRL', interval: 'month', available,
      capabilities: keys.map(key => ({ key, label: PROFILE_CAPABILITY_LABELS[key], delivered: runtime.delivered.has(key) })) }
  })]
}
export async function readMySubscription(db: PrismaClient, actor: BillingActor, runtime: BillingRuntime, now = new Date()) {
  const user = await requireBillingActor(db, actor)
  const include = { planVersion: { include: { plan: true } }, scheduledVersion: { include: { plan: true } }, entitlements: true } satisfies Prisma.ProfileSubscriptionInclude
  const readCurrent = async () => await db.profileSubscription.findFirst({ where: { ...actor, status: { in: BILLING_OPEN_STATES } }, include })
    ?? await db.profileSubscription.findFirst({ where: actor, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include })
  const [subscription, profile] = await Promise.all([
    readCurrent(),
    db.profile.count({ where: actor }),
  ])
  const capabilities = coveredProfileCapabilities(subscription, user.identifiers.length > 0, runtime.delivered, now)
  return {
    canCheckout: profile > 0 && canSubmitLinkFromIdentifiers(user.status, user.identifiers),
    checkoutRequirement: !canSubmitLinkFromIdentifiers(user.status, user.identifiers) ? 'VERIFY' : !profile ? 'CREATE_PAGE' : null,
    capabilities,
      subscription: subscription ? { id: subscription.id, planVersionId: subscription.planVersionId, tier: tier(subscription.planVersion.plan.tier), title: subscription.planVersion.plan.title, status: subscription.status,
        canChange: subscription.status === 'ACTIVE' && !subscription.cancelAtPeriodEnd && Boolean(subscription.periodEnd && subscription.periodEnd.getTime() > now.getTime()+300000 && subscription.paidThrough && subscription.paidThrough > now),
      version: subscription.version, periodStart: subscription.periodStart, periodEnd: subscription.periodEnd, paidThrough: subscription.paidThrough,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, reviewReason: subscription.reviewReason, resumeCheckoutUrl: checkoutUrl(subscription, now),
      hasPaidAccess: capabilities.some(key => !BASE_PROFILE_CAPABILITIES.some(base => base === key)),
      nextPlan: subscription.scheduledVersion ? { tier: tier(subscription.scheduledVersion.plan.tier), title: subscription.scheduledVersion.plan.title } : null,
    } : null,
    operations: await db.profileBillingOperation.findMany({ where: { ...actor, state: { in: ['PENDING','PROCESSING'] } }, select: { id: true, kind: true, state: true }, take: 5 }),
  }
}
function checkoutUrl(row: { status: string; checkoutUrl: string | null; checkoutExpiresAt: Date | null }, now: Date) {
  if (!['PENDING','INCOMPLETE'].includes(row.status) || !row.checkoutUrl || !row.checkoutExpiresAt || row.checkoutExpiresAt <= now) return null
  try { return hostedBillingUrl(row.checkoutUrl) } catch { return null }
}
export async function readBillingAdmin(db: PrismaClient, actor: BillingActor, runtime: BillingRuntime) {
  await requireBillingActor(db, actor, 'ADMIN')
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: actor.tenantId } })
  return {
    settings: await db.profileBillingSettings.findUnique({ where: { tenantId: actor.tenantId } }) ?? { enabled: false, fiscalReviewed: false, publicOrigin: 'https://' + tenant.host, livemode: runtime.gateway?.livemode ?? false, version: 0 },
    providerConfigured: Boolean(runtime.gateway && runtime.webhookReady), webhookReady: runtime.webhookReady, salesEnabled: runtime.enabled,
    plans: await db.profilePlan.findMany({ where: { tenantId: actor.tenantId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } }, orderBy: { tier: 'asc' } }),
    capabilities: PROFILE_CAPABILITIES.map(key => ({ key, label: PROFILE_CAPABILITY_LABELS[key], delivered: runtime.delivered.has(key) })),
      failedOperations: await db.profileBillingOperation.findMany({ where: { tenantId: actor.tenantId, state: 'FAILED' }, select: { id: true, kind: true, lastError: true, attempts: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      failedEvents: await db.profileBillingEvent.findMany({ where: { tenantId: actor.tenantId, state: 'FAILED' }, select: { id: true, lastError: true, attempts: true, receivedAt: true }, orderBy: { receivedAt: 'desc' }, take: 20 }),
      reviews: await db.profileSubscription.findMany({ where: { tenantId: actor.tenantId, reviewReason: { not: null } }, select: { id: true, status: true, reviewReason: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 20 }),
  }
}
function publicOrigin(input: string, host: string, production: boolean) {
  const url = new URL(input)
  const local = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  if (url.hostname !== host || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && !production && local))) throw new BillingError(422, 'Use o endereço público deste site, com HTTPS em produção.')
  return url.origin
}
export async function saveBillingSettings(db: PrismaClient, actor: BillingActor, input: z.infer<typeof billingSettingsInput>, runtime: BillingRuntime) {
  return withBillingActor(db, actor, 'ADMIN', async tx => {
    await tx.$queryRawUnsafe('SELECT id FROM tenants WHERE id=$1 FOR UPDATE', actor.tenantId)
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: actor.tenantId } })
    const current = await tx.profileBillingSettings.findUnique({ where: { tenantId: actor.tenantId } })
    if ((current?.version ?? 0) !== input.expectedVersion) throw new BillingError(409, 'A configuração mudou. Atualize antes de salvar.')
    if (input.enabled && (!runtime.enabled || !runtime.gateway || !runtime.webhookReady || !input.fiscalReviewed)) throw new BillingError(422, 'Revise provedor, webhook, habilitação de vendas e configuração fiscal antes de liberar novas assinaturas.')
    const mode = runtime.gateway?.livemode ?? current?.livemode ?? false
    if (current && current.livemode !== mode && await tx.profileBillingAccount.count({ where: { tenantId: actor.tenantId } })) throw new BillingError(409, 'Este ambiente já tem contas de cobrança. A troca de ambiente exige uma migração própria.')
    const data = { enabled: input.enabled, fiscalReviewed: input.fiscalReviewed, publicOrigin: publicOrigin(input.publicOrigin, tenant.host, runtime.production), livemode: mode, version: (current?.version ?? 0) + 1 }
    const result = await tx.profileBillingSettings.upsert({ where: { tenantId: actor.tenantId }, create: { tenantId: actor.tenantId, ...data }, update: data })
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'profile.billing.settings', entityType: 'ProfileBillingSettings', entityId: actor.tenantId, after: data } })
    return result
  })
}
export async function saveProfilePlan(db: PrismaClient, actor: BillingActor, input: z.infer<typeof billingPlanInput>, runtime: BillingRuntime) {
  await requireBillingActor(db, actor, 'ADMIN')
  if (!runtime.gateway) throw new BillingError(503, 'Configure o provedor de assinaturas antes de cadastrar um preço.')
  const price = await runtime.gateway.price(input.providerPriceId)
  if (!price.active || price.amountCents !== input.amountCents || price.currency !== input.currency || price.interval !== 'month' || price.intervalCount !== 1 || price.usageType !== 'licensed' || price.livemode !== runtime.gateway.livemode) throw new BillingError(422, 'O preço deve estar ativo e corresponder ao valor mensal em reais informado.')
  return withBillingActor(db, actor, 'ADMIN', async tx => {
    await tx.$queryRawUnsafe('SELECT id FROM tenants WHERE id=$1 FOR UPDATE', actor.tenantId)
    const current = await tx.profilePlan.findUnique({ where: { tenantId_tier: { tenantId: actor.tenantId, tier: input.tier } }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } })
    if ((current?.version ?? 0) !== input.expectedVersion) throw new BillingError(409, 'O plano mudou. Atualize antes de salvar.')
    if (current?.providerProductId && current.providerProductId !== price.productId) throw new BillingError(422, 'Mantenha as versões de um plano no mesmo produto Stripe.')
    if (await tx.profilePlan.findFirst({ where: { providerProductId: price.productId, ...(current ? { id: { not: current.id } } : {}) } })) throw new BillingError(422, 'Use um produto Stripe distinto para cada plano e site.')
    const settings = await tx.profileBillingSettings.findUnique({ where: { tenantId: actor.tenantId } })
    if (input.enabled && profileSaleBlock(input, { enabled: runtime.enabled && Boolean(settings?.enabled), providerConfigured: runtime.webhookReady && runtime.gateway!.livemode === settings?.livemode, fiscalReviewed: Boolean(settings?.fiscalReviewed), deliveredCapabilities: runtime.delivered }) !== null) throw new BillingError(422, 'Este plano ainda não tem todas as condições e recursos liberados para venda.')
    const latest = current?.versions[0]
    const same = latest && latest.providerPriceId === input.providerPriceId && latest.amountCents === input.amountCents && JSON.stringify([...latest.capabilities].sort()) === JSON.stringify([...input.capabilities].sort())
    if (!same && await tx.profilePlanVersion.findFirst({ where: { providerPriceId: input.providerPriceId } })) throw new BillingError(422, 'Crie outro Price para uma nova edição do plano; os contratos anteriores são preservados.')
    const plan = await tx.profilePlan.upsert({ where: { tenantId_tier: { tenantId: actor.tenantId, tier: input.tier } }, create: { tenantId: actor.tenantId, tier: input.tier, title: PROFILE_TIER_LABELS[input.tier], enabled: input.enabled, providerProductId: price.productId, version: 1 }, update: { enabled: input.enabled, version: { increment: 1 } } })
    if (!same) await tx.profilePlanVersion.create({ data: { tenantId: actor.tenantId, planId: plan.id, version: (latest?.version ?? 0) + 1, amountCents: input.amountCents, currency: 'BRL', interval: 'month', capabilities: input.capabilities, providerPriceId: price.id, providerProductId: price.productId, livemode: price.livemode } })
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'profile.plan.version', entityType: 'ProfilePlan', entityId: plan.id, after: { version: plan.version, enabled: plan.enabled, providerPriceId: price.id } } })
    return { id: plan.id, version: plan.version }
  })
}
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
async function duplicateOperation(tx: Prisma.TransactionClient, actor: BillingActor, requestKey: string, hash: string) {
  const existing = await tx.profileBillingOperation.findUnique({ where: { tenantId_ownerId_requestKey: { ...actor, requestKey } } })
  if (existing && existing.fingerprint !== hash) throw new BillingError(409, 'Esta chave já foi usada em outra solicitação.')
  return existing
}
export async function requestProfileCheckout(db: PrismaClient, actor: BillingActor, input: z.infer<typeof billingCheckoutInput>, requestKey: string, runtime: BillingRuntime, now = new Date()) {
  const hash = fingerprint({ kind: 'CHECKOUT', ...input })
  return withBillingActor(db, actor, 'PURCHASE', async tx => {
    const existing = await duplicateOperation(tx, actor, requestKey, hash)
    if (existing) return { operationId: existing.id }
    const catalog = await billingCatalog(tx, actor.tenantId, runtime)
    if (!catalog.some(plan => plan.versionId === input.planVersionId && plan.available)) throw new BillingError(409, 'Este plano ainda não está disponível para assinatura.')
    if (!await tx.profile.count({ where: actor })) throw new BillingError(422, 'Crie sua página antes de escolher uma assinatura.')
    if (await tx.profileSubscription.findFirst({ where: { ...actor, status: { in: BILLING_OPEN_STATES } } })) throw new BillingError(409, 'Já existe uma assinatura ou pagamento em andamento. Consulte a situação antes de tentar outra compra.')
    const account = await tx.profileBillingAccount.upsert({ where: { tenantId_ownerId: actor }, create: actor, update: {} })
    const subscription = await tx.profileSubscription.create({ data: { ...actor, accountId: account.id, planVersionId: input.planVersionId, createdAt: now } })
    const settings = await tx.profileBillingSettings.findUniqueOrThrow({ where: { tenantId: actor.tenantId } })
    const operation = await tx.profileBillingOperation.create({ data: { ...actor, subscriptionId: subscription.id, targetVersionId: input.planVersionId, kind: 'CHECKOUT', requestKey, fingerprint: hash, expectedVersion: 0, returnPath: input.returnPath, returnOrigin: settings.publicOrigin, createdAt: now, nextAttemptAt: now } })
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'profile.subscription.checkout_requested', entityType: 'ProfileSubscription', entityId: subscription.id, after: { operationId: operation.id, planVersionId: input.planVersionId } } })
    return { operationId: operation.id }
  })
}
export async function requestProfileSubscriptionChange(db: PrismaClient, actor: BillingActor, input: { kind: 'CANCEL' | 'CHANGE'; expectedVersion: number; targetVersionId?: string }, requestKey: string, runtime: BillingRuntime, now = new Date()) {
  const hash = fingerprint(input)
  return withBillingActor(db, actor, input.kind === 'CANCEL' ? 'CANCEL' : 'PURCHASE', async tx => {
    const existing = await duplicateOperation(tx, actor, requestKey, hash)
    if (existing) return { operationId: existing.id }
    const subscription = await tx.profileSubscription.findFirst({ where: { ...actor, status: { in: BILLING_OPEN_STATES } }, orderBy: { createdAt: 'desc' } })
    if (!subscription) throw new BillingError(404, 'Assinatura não encontrada.')
    if (subscription.version !== input.expectedVersion) throw new BillingError(409, 'A assinatura mudou. Atualize antes de continuar.')
    if (await tx.profileBillingOperation.findFirst({ where: { ...actor, state: { in: ['PENDING','PROCESSING'] } } })) throw new BillingError(409, 'Aguarde a solicitação anterior terminar.')
    if (input.kind === 'CHANGE') {
      if (subscription.cancelAtPeriodEnd || subscription.status !== 'ACTIVE' || input.targetVersionId === subscription.planVersionId) throw new BillingError(409, 'Esta troca não está disponível para a situação atual.')
      if (!subscription.periodEnd || subscription.periodEnd.getTime() <= now.getTime()+300000 || !subscription.paidThrough || subscription.paidThrough <= now) throw new BillingError(409, 'Aguarde a confirmação do ciclo para solicitar a troca.')
      const catalog = await billingCatalog(tx, actor.tenantId, runtime)
      if (!input.targetVersionId || !catalog.some(plan => plan.versionId === input.targetVersionId && plan.available)) throw new BillingError(409, 'O plano de destino não está disponível.')
    }
    const operation = await tx.profileBillingOperation.create({ data: { ...actor, subscriptionId: subscription.id, targetVersionId: input.targetVersionId ?? null, kind: input.kind, requestKey, fingerprint: hash, expectedVersion: subscription.version, referencePeriodEnd: subscription.periodEnd, createdAt: now, nextAttemptAt: now } })
    await tx.profileSubscription.update({ where: { id: subscription.id }, data: { version: { increment: 1 } } })
    return { operationId: operation.id }
  })
}
export async function readBillingOperation(db: PrismaClient, actor: BillingActor, operationId: string, now = new Date()) {
  await requireBillingActor(db, actor)
  const operation = await db.profileBillingOperation.findFirst({ where: { id: operationId, ...actor }, include: { subscription: true } })
  if (!operation) throw new BillingError(404, 'Solicitação não encontrada.')
  const row = operation.subscription
  return { id: operation.id, kind: operation.kind, state: operation.state,
    checkoutUrl: operation.kind === 'CHECKOUT' && operation.state === 'DONE' ? checkoutUrl(row, now) : null,
    message: operation.state === 'FAILED' ? 'Não foi possível concluir. Atualize a situação antes de tentar novamente.' : null,
  }
}
