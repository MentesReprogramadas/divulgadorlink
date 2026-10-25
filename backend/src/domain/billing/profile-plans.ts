export const BASE_PROFILE_CAPABILITIES = ['profile.page', 'profile.categories', 'profile.appearance', 'profile.history'] as const
export const PROFILE_CAPABILITIES = [...BASE_PROFILE_CAPABILITIES, 'profile.analytics', 'profile.scheduling', 'profile.richBlocks', 'profile.subdomain'] as const
export type ProfileCapability = typeof PROFILE_CAPABILITIES[number]
export type ProfileTier = 'FREE' | 'PRO' | 'PREMIUM'
export type PaidSubscription = { status: string; periodStart: Date | null; periodEnd: Date | null; paidThrough: Date | null; capabilities: readonly ProfileCapability[] }

/** Existing free authoring capabilities never depend on the billing provider. */
export function profileCapabilities(subscription: PaidSubscription | null, available: ReadonlySet<ProfileCapability>, now: Date): ProfileCapability[] {
  const base: ProfileCapability[] = [...BASE_PROFILE_CAPABILITIES]
  if (!subscription || !['ACTIVE', 'PAST_DUE'].includes(subscription.status)) return base
  const { periodStart, periodEnd, paidThrough } = subscription
  if (!periodStart || !periodEnd || !paidThrough || ![periodStart, periodEnd, paidThrough, now].every(date => Number.isFinite(date.getTime()))) return base
  if (periodStart >= periodEnd || now < periodStart || Math.min(periodEnd.getTime(), paidThrough.getTime()) <= now.getTime()) return base
  return [...new Set([...base, ...PROFILE_CAPABILITIES.filter(key => available.has(key) && subscription.capabilities.includes(key))])]
}
export type ProfilePlanInput = { tier: ProfileTier; amountCents: number; currency: string; interval: string; providerPriceId: string | null; capabilities: readonly ProfileCapability[] }
export type ProfileSaleReadiness = { enabled: boolean; providerConfigured: boolean; fiscalReviewed: boolean; deliveredCapabilities: ReadonlySet<ProfileCapability> }
export function profileSaleBlock(plan: ProfilePlanInput, readiness: ProfileSaleReadiness): 'DISABLED' | 'PROVIDER' | 'FISCAL_REVIEW' | 'PRICE' | 'NOT_DELIVERED' | null {
  if (!validateProfilePlan(plan)) return 'PRICE'
  if (plan.tier === 'FREE') return null
  if (!readiness.enabled) return 'DISABLED'
  if (!readiness.providerConfigured) return 'PROVIDER'
  if (!readiness.fiscalReviewed) return 'FISCAL_REVIEW'
  if (!plan.capabilities.every(key => readiness.deliveredCapabilities.has(key))) return 'NOT_DELIVERED'
  return null
}
export function validateProfilePlan(input: ProfilePlanInput): boolean {
  if (!['FREE','PRO','PREMIUM'].includes(input.tier) || input.currency !== 'BRL' || input.interval !== 'month') return false
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 0 || input.amountCents > 2147483647) return false
  const keys = new Set(input.capabilities)
  if (keys.size !== input.capabilities.length || !BASE_PROFILE_CAPABILITIES.every(key => keys.has(key)) || !input.capabilities.every(key => PROFILE_CAPABILITIES.includes(key))) return false
  if (input.tier === 'FREE') return input.amountCents === 0 && input.providerPriceId === null && keys.size === BASE_PROFILE_CAPABILITIES.length
  if (input.amountCents === 0 || !input.providerPriceId || !/^price_[a-zA-Z0-9_]{1,100}$/.test(input.providerPriceId) || keys.size === BASE_PROFILE_CAPABILITIES.length) return false
  return input.tier !== 'PRO' || !input.capabilities.some(key => key === 'profile.richBlocks' || key === 'profile.subdomain')
}
export function billingReturnPath(input = '/painel/assinatura'): string {
  if (!['/painel/assinatura', '/painel/perfil'].includes(input)) throw new Error('Escolha um retorno interno permitido.')
  return input
}
export function hostedBillingUrl(input: string): string {
  // URL() alone silently strips some control characters; reject them before parsing.
  // eslint-disable-next-line no-control-regex
  if (input.length > 16384 || /[\u0000-\u0020\u007f]/u.test(input)) throw new Error('Checkout inválido.')
  const url = new URL(input)
  // Contavera uses its verified custom domain for Stripe-hosted Checkout.
  if (!['https://checkout.stripe.com','https://checkout.contavera.com'].includes(url.origin) || url.username || url.password || !url.pathname.startsWith('/c/pay/')) throw new Error('Checkout inválido.')
  return url.href
}
