export type ProfilePlan = { tier: 'FREE' | 'PRO' | 'PREMIUM'; title: string; versionId: string | null; amountCents: number | null; currency: string; interval: string; available: boolean; capabilities: Array<{key: string; label: string; delivered: boolean}> }
export type ProfileSubscription = { id: string; planVersionId: string; canChange: boolean; tier: ProfilePlan['tier']; title: string; status: string; version: number; periodStart: string | null; periodEnd: string | null; paidThrough: string | null; cancelAtPeriodEnd: boolean; reviewReason: string | null; resumeCheckoutUrl: string | null; hasPaidAccess: boolean; nextPlan: {tier: string; title: string} | null }
export type BillingState = { canCheckout: boolean; checkoutRequirement: 'VERIFY' | 'CREATE_PAGE' | null; capabilities: string[]; subscription: ProfileSubscription | null; operations: Array<{id: string; kind: string; state: string}> }
export type BillingOperation = { id: string; kind: string; state: string; checkoutUrl: string | null; message: string | null }
export const OPEN_SUBSCRIPTION_STATES = ['PENDING','ACTIVE','PAST_DUE','UNPAID','INCOMPLETE','REVIEW']
export const billingStatus: Record<string,string> = { PENDING:'Aguardando pagamento', INCOMPLETE:'Pagamento incompleto', ACTIVE:'Ativa', PAST_DUE:'Pagamento pendente', UNPAID:'Pagamento não confirmado', CANCELED:'Encerrada', EXPIRED:'Expirada', REVIEW:'Em conferência' }
export const billingMoney = (cents: number, currency: string) => new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(cents/100)
export const billingDate = (value: string) => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value))
export function safeBillingCheckout(input: string) {
  const url = new URL(input)
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.port || url.username || url.password || !url.pathname.startsWith('/c/pay/')) throw new Error('Endereço de pagamento inválido. Atualize a situação.')
  return url.href
}
