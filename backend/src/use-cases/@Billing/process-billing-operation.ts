import type { PrismaClient } from '@prisma/client'
import { BillingError } from '@/domain/billing/billing-input'
import { BillingProviderError } from '@/domain/billing/billing-gateway'
import { hostedBillingUrl } from '@/domain/billing/profile-plans'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import { billingCatalog, type BillingRuntime } from '@/repositories/profile-billing-repository'
import { applyBillingSnapshot, BILLING_MAX_ATTEMPTS, claimBillingOperation, failBillingWork, finishBillingWork, reserveBillingReconciliation, type BillingWork } from '@/repositories/profile-billing-work'

export const BILLING_CHECKOUT_WINDOW_MS = 60 * 60 * 1000

export async function processBillingOperation(db: PrismaClient, runtime: BillingRuntime, clock = () => new Date()) {
  const claimed = await claimBillingOperation(db, clock())
  if (!claimed || !claimed.leaseToken) return false
  const work: BillingWork = { kind: 'OPERATION', id: claimed.id, leaseToken: claimed.leaseToken }
  try {
    const gateway = runtime.gateway
    if (!gateway) throw new BillingProviderError('UNAVAILABLE')
    const operation = await db.profileBillingOperation.findUniqueOrThrow({ where: { id: claimed.id }, include: { subscription: { include: { account: true, planVersion: { include: { plan: true } } } }, targetVersion: true } })
    if (operation.leaseToken !== work.leaseToken || operation.state !== 'PROCESSING') return true
    const row = operation.subscription, account = row.account
    const settings = await db.profileBillingSettings.findUnique({ where: { tenantId: row.tenantId } })
    if (!settings || settings.livemode !== gateway.livemode) throw new BillingError(409, 'Configuração de cobrança incompatível.')
    if (operation.kind === 'CHECKOUT') {
      const user = await db.user.findUniqueOrThrow({ where: { id: row.ownerId }, include: { identifiers: true } })
      if (!canSubmitLinkFromIdentifiers(user.status, user.identifiers)) throw new BillingError(403, 'Conta indisponível para novas assinaturas.')
      if (row.status !== 'PENDING' || operation.createdAt.getTime() + BILLING_CHECKOUT_WINDOW_MS <= clock().getTime()) throw new BillingError(409, 'Solicitação expirada.')
      const catalog = await billingCatalog(db, row.tenantId, runtime)
      if (!catalog.some(plan => plan.available && plan.versionId === row.planVersionId)) throw new BillingError(409, 'Plano indisponível.')
      const version = row.planVersion
      if (!version.providerPriceId || !version.providerProductId) throw new BillingError(409, 'Preço indisponível.')
      const price = await gateway.price(version.providerPriceId)
      if (!price.active || price.id !== version.providerPriceId || price.productId !== version.providerProductId || price.amountCents !== version.amountCents || price.currency !== version.currency || price.interval !== 'month' || price.intervalCount !== 1 || price.usageType !== 'licensed' || price.livemode !== version.livemode) throw new BillingError(409, 'Preço indisponível.')
      let customerId = account.providerCustomerId
      if (!customerId) {
        const created = await gateway.createCustomer('profile-customer-' + account.id)
        await db.profileBillingAccount.updateMany({ where: { id: account.id, providerCustomerId: null }, data: { providerCustomerId: created } })
        const stored = await db.profileBillingAccount.findUniqueOrThrow({ where: { id: account.id } })
        if (stored.providerCustomerId !== created) throw new BillingProviderError('UNSUPPORTED')
        customerId = created
      }
      // Customer creation cannot authorize a Checkout after the account or offer was withdrawn.
      const currentUser = await db.user.findUniqueOrThrow({ where: { id: row.ownerId }, include: { identifiers: true } })
      if (!canSubmitLinkFromIdentifiers(currentUser.status, currentUser.identifiers) || !(await billingCatalog(db, row.tenantId, runtime)).some(plan => plan.available && plan.versionId === row.planVersionId)) throw new BillingError(409, 'A assinatura deixou de estar disponível.')
      await db.profileSubscription.updateMany({ where: { id: row.id, checkoutExpiresAt: null }, data: { checkoutExpiresAt: new Date(clock().getTime() + BILLING_CHECKOUT_WINDOW_MS) } })
      const current = await db.profileSubscription.findUniqueOrThrow({ where: { id: row.id } })
      if (!current.checkoutExpiresAt || current.checkoutExpiresAt <= clock()) throw new BillingError(409, 'Solicitação expirada.')
      if (!operation.returnOrigin) throw new BillingError(409, 'Retorno não configurado.')
      const success = new URL(operation.returnPath ?? '/painel/assinatura', operation.returnOrigin), cancel = new URL(success)
      success.searchParams.set('checkout', 'returned'); cancel.searchParams.set('checkout', 'canceled')
      const session = await gateway.createCheckout({ customerId, priceId: version.providerPriceId, referenceId: row.id, successUrl: success.href, cancelUrl: cancel.href, expiresAt: current.checkoutExpiresAt, idempotencyKey: 'profile-checkout-' + operation.id })
      const checkoutUrl = hostedBillingUrl(session.url)
      await db.$transaction(async tx => {
        const held = await tx.profileBillingOperation.findFirst({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING' } })
        if (!held) return
        const owner = await tx.user.findUniqueOrThrow({ where: { id: row.ownerId }, include: {identifiers:true} })
        const eligible = canSubmitLinkFromIdentifiers(owner.status,owner.identifiers)
        await tx.profileSubscription.update({ where: { id: row.id }, data: { providerCheckoutId: session.id, checkoutExpiresAt: session.expiresAt, checkoutUrl: eligible ? checkoutUrl : null, version: { increment: 1 } } })
        await tx.profileBillingOperation.update({ where: { id: work.id }, data: { state: eligible ? 'DONE' : 'FAILED', leaseToken: null, lockedAt: null, lastError: eligible ? null : 'ACCOUNT_UNAVAILABLE' } })
      })
      return true
    }
    if (operation.kind !== 'CANCEL' && operation.kind !== 'CHANGE') throw new BillingError(409, 'Operação indisponível.')
    let providerId = row.providerSubscriptionId
    if (!providerId && row.providerCheckoutId) {
      const session = await gateway.checkout(row.providerCheckoutId)
      if (session.customerId !== account.providerCustomerId) throw new BillingProviderError('UNSUPPORTED')
      providerId = session.subscriptionId
      if (!providerId && operation.kind === 'CANCEL') {
        if (session.status === 'OPEN') await gateway.expireCheckout(session.id, 'profile-expire-' + operation.id)
        const after = await gateway.checkout(session.id)
        if (after.status !== 'EXPIRED') throw new BillingProviderError('UNAVAILABLE')
        await db.profileSubscription.updateMany({ where: { id: row.id, providerSubscriptionId: null, status: { in: ['PENDING','INCOMPLETE'] } }, data: { status: 'CANCELED', checkoutUrl: null, version: { increment: 1 } } })
        await finishBillingWork(db, work, 'DONE', clock())
        return true
      }
    }
    if (!providerId) {
      if (operation.kind !== 'CANCEL') throw new BillingError(409, 'Pagamento ainda não confirmado.')
      // The URL is exposed only after its reference and DONE state commit together.
      if (row.providerCheckoutId) throw new BillingProviderError('UNAVAILABLE')
      await db.profileSubscription.updateMany({ where: { id: row.id, providerSubscriptionId: null, providerCheckoutId: null, status: 'PENDING' }, data: { status: 'CANCELED', checkoutUrl: null, version: { increment: 1 } } })
      await finishBillingWork(db, work, 'DONE', clock())
      return true
    }
    const before = await gateway.subscription(providerId)
    if (before.customerId !== account.providerCustomerId || before.livemode !== settings.livemode) throw new BillingProviderError('UNSUPPORTED')
    if (operation.kind === 'CANCEL') {
      if (before.status !== 'CANCELED') {
        const paid = before.paidThrough && before.periodEnd && Math.min(before.paidThrough.getTime(), before.periodEnd.getTime()) > clock().getTime()
        if (paid) await gateway.cancelAtPeriodEnd(providerId, 'profile-cancel-end-' + operation.id)
        else await gateway.cancelUnpaid(providerId, 'profile-cancel-unpaid-' + operation.id)
      }
    } else {
      const owner = await db.user.findUniqueOrThrow({ where: { id: row.ownerId }, include: { identifiers: true } })
      if (!canSubmitLinkFromIdentifiers(owner.status, owner.identifiers)) throw new BillingError(403, 'Conta indisponível para trocar o plano.')
      const target = operation.targetVersion
      const catalog = await billingCatalog(db, row.tenantId, runtime)
      if (!target?.providerPriceId || !catalog.some(plan => plan.available && plan.versionId === target.id)) throw new BillingError(409, 'Plano de destino indisponível.')
      if (!operation.referencePeriodEnd || before.periodEnd?.getTime() !== operation.referencePeriodEnd.getTime() || before.periodEnd.getTime() - clock().getTime() <= 300000 || before.status !== 'ACTIVE' || before.cancelAtPeriodEnd) throw new BillingError(409, 'O período mudou ou está terminando. Confirme a troca após a renovação.')
      const price = await gateway.price(target.providerPriceId)
      if (!price.active || price.id !== target.providerPriceId || price.productId !== target.providerProductId || price.amountCents !== target.amountCents || price.currency !== 'BRL' || price.interval !== 'month' || price.intervalCount !== 1 || price.usageType !== 'licensed' || price.livemode !== target.livemode) throw new BillingError(409, 'Preço de destino indisponível.')
      await gateway.changeAtPeriodEnd({ subscriptionId: providerId, currentPriceId: before.priceId, nextPriceId: target.providerPriceId, expectedPeriodEnd: operation.referencePeriodEnd, idempotencyKey: 'profile-change-' + operation.id })
    }
    const reservation = await reserveBillingReconciliation(db, row.id, work)
    if (!reservation) return true
    const after = await gateway.subscription(providerId)
    await applyBillingSnapshot(db, reservation, after, clock())
    await finishBillingWork(db, work, 'DONE', clock())
    return true
  } catch (error) {
    const provider = error instanceof BillingProviderError, business = error instanceof BillingError
    const retry = !business && (!provider || error.code === 'UNAVAILABLE')
    const failed = await failBillingWork(db, work, claimed.attempts, provider ? error.code : business ? 'PRECONDITION' : 'STORAGE_FAILURE', retry, clock())
    if (failed.count && claimed.kind === 'CHECKOUT' && (!retry || claimed.attempts >= BILLING_MAX_ATTEMPTS)) {
      await db.profileSubscription.updateMany({ where: { id: claimed.subscriptionId, providerCheckoutId: null, providerSubscriptionId: null, status: 'PENDING' }, data: { status: 'EXPIRED', checkoutUrl: null, version: { increment: 1 } } })
    }
    return true
  }
}
