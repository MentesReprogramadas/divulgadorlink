import { describe, expect, it } from 'vitest'
import { BASE_PROFILE_CAPABILITIES, PROFILE_CAPABILITIES, billingReturnPath, hostedBillingUrl, profileCapabilities, profileSaleBlock, validateProfilePlan, type PaidSubscription } from './profile-plans'
const now = new Date('2026-10-17T12:00:00Z'), available = new Set(PROFILE_CAPABILITIES)
const active: PaidSubscription = { status: 'ACTIVE', periodStart: new Date('2026-10-01T00:00:00Z'), periodEnd: new Date('2026-11-01T00:00:00Z'), paidThrough: new Date('2026-11-01T00:00:00Z'), capabilities: [...BASE_PROFILE_CAPABILITIES, 'profile.analytics'] }
describe('F11 paid capabilities', () => {
 it('F11-U01/T02 active and paid coverage unlocks only delivered capabilities; browser return and pending do not', () => {
   expect(profileCapabilities(active, available, now)).toContain('profile.analytics')
   expect(profileCapabilities({ ...active, status: 'PENDING' }, available, now)).toEqual(BASE_PROFILE_CAPABILITIES)
   expect(profileCapabilities({ ...active, paidThrough: null }, available, now)).toEqual(BASE_PROFILE_CAPABILITIES)
   expect(profileCapabilities(active, new Set(BASE_PROFILE_CAPABILITIES), now)).toEqual(BASE_PROFILE_CAPABILITIES)
 })
 it.each(['CANCELED','UNPAID','INCOMPLETE','EXPIRED'])('F11-U02 %s does not grant paid features', status => {
   expect(profileCapabilities({ ...active, status }, available, now)).toEqual(BASE_PROFILE_CAPABILITIES)
 })
 it('F11-U02 expiration and future coverage are closed; past-due never extends already paid time', () => {
   expect(profileCapabilities({ ...active, paidThrough: now }, available, now)).toEqual(BASE_PROFILE_CAPABILITIES)
   expect(profileCapabilities({ ...active, periodStart: new Date('2026-11-01') }, available, now)).toEqual(BASE_PROFILE_CAPABILITIES)
   expect(profileCapabilities({ ...active, status: 'PAST_DUE' }, available, now)).toContain('profile.analytics')
   expect(profileCapabilities({ ...active, periodEnd: now }, available, now)).toEqual(BASE_PROFILE_CAPABILITIES)
 })
 it('F11-U03/T01 downgrade preserves all existing free customization and never mutates the authoring data', () => {
   const snapshot = structuredClone(active)
   const result = profileCapabilities(null, available, now)
   expect(result).toEqual(['profile.page','profile.categories','profile.appearance','profile.history'])
   expect(active).toEqual(snapshot)
   expect(result).not.toContain('profile.removeBranding')
 })
})
const paid = { tier: 'PRO' as const, amountCents: 1290, currency: 'BRL', interval: 'month', providerPriceId: 'price_fixture', capabilities: [...BASE_PROFILE_CAPABILITIES, 'profile.analytics' as const] }
it('F11-T04 sale requires an explicit release, provider, fiscal review and delivered capabilities; free use does not', () => {
 const ready = { enabled: true, providerConfigured: true, fiscalReviewed: true, deliveredCapabilities: new Set(PROFILE_CAPABILITIES) }
 expect(profileSaleBlock(paid,ready)).toBeNull()
 expect(profileSaleBlock(paid,{...ready,enabled:false})).toBe('DISABLED')
 expect(profileSaleBlock(paid,{...ready,providerConfigured:false})).toBe('PROVIDER')
 expect(profileSaleBlock(paid,{...ready,fiscalReviewed:false})).toBe('FISCAL_REVIEW')
 expect(profileSaleBlock(paid,{...ready,deliveredCapabilities:new Set(BASE_PROFILE_CAPABILITIES)})).toBe('NOT_DELIVERED')
 expect(profileSaleBlock({...paid,tier:'FREE',amountCents:0,providerPriceId:null,capabilities:BASE_PROFILE_CAPABILITIES},{...ready,enabled:false,providerConfigured:false,fiscalReviewed:false})).toBeNull()
})
it('F11-U04/T04 prices use exact cents, a recurring provider Price and valid capacities', () => {
 expect(validateProfilePlan(paid)).toBe(true)
 for (const change of [{ amountCents: 12.9 }, { amountCents: -1 }, { amountCents: 0 }, { amountCents: 2147483648 }, { currency: 'USD' }, { interval: 'year' }, { providerPriceId: null }, { capabilities: [...paid.capabilities, 'profile.analytics' as const] }, { capabilities: ['profile.analytics' as const] }]) expect(validateProfilePlan({ ...paid, ...change })).toBe(false)
 expect(validateProfilePlan({ tier: 'FREE', amountCents: 0, currency: 'BRL', interval: 'month', providerPriceId: null, capabilities: BASE_PROFILE_CAPABILITIES })).toBe(true)
 expect(validateProfilePlan({ ...paid, tier: 'FREE' })).toBe(false)
})
it('F11-T04 checkout only uses an explicit internal return and the real hosted provider origin', () => {
 expect(billingReturnPath()).toBe('/painel/assinatura')
 expect(billingReturnPath('/painel/perfil')).toBe('/painel/perfil')
 for (const target of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/painel/assinatura?redirect=https://evil.test','/admin','/painel/../admin']) expect(() => billingReturnPath(target)).toThrow()
 expect(hostedBillingUrl('https://checkout.stripe.com/c/pay/cs_fixture#token')).toBe('https://checkout.stripe.com/c/pay/cs_fixture#token')
 for (const target of ['javascript:alert(1)','http://checkout.stripe.com/c/pay/x','https://checkout.stripe.com.evil.test','https://user@checkout.stripe.com/c/pay/x','https://checkout.stripe.com:444/c/pay/x','https://billing.stripe.com/p/session/x']) expect(() => hostedBillingUrl(target)).toThrow()
})
