import { parseArgs } from 'node:util'
import { z } from 'zod'
import Stripe from 'stripe-billing'
import type { PrismaClient } from '@prisma/client'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { profileBillingRuntime } from '@/lib/profile-billing'
import { BASE_PROFILE_CAPABILITIES, type ProfileCapability } from '@/domain/billing/profile-plans'
import { billingPlanInput, billingSettingsInput } from '@/domain/billing/billing-input'
import { billingCatalog, readBillingAdmin, saveBillingSettings, saveProfilePlan, type BillingRuntime } from '@/repositories/profile-billing-repository'

const optionsSchema = z.object({
  host: z.string().min(1).max(253), adminEmail: z.string().trim().toLowerCase().email(),
  fiscalReviewed: z.literal(true), proPriceId: z.string(), premiumPriceId: z.string(),
  proAmountCents: z.number().int().positive(), premiumAmountCents: z.number().int().positive(),
})
type Options = z.infer<typeof optionsSchema>

/** Operator entry point; all writes retain the administrative billing validations and audit. */
export async function configureProfilePlans(db: PrismaClient, input: Options, runtime: BillingRuntime) {
  const options = optionsSchema.parse(input)
  const tenant = await db.tenant.findUniqueOrThrow({ where: { host: options.host } })
  const admin = await db.user.findFirstOrThrow({ where: { tenantId: tenant.id, role: 'ADMIN', status: 'ACTIVE', identifiers: { some: { kind: 'EMAIL', normalizedValue: options.adminEmail } } } })
  const actor = { tenantId: tenant.id, ownerId: admin.id }
  const current = await readBillingAdmin(db, actor, runtime)
  const origin = (runtime.production ? 'https://' : 'http://') + tenant.host
  if (!current.settings.enabled || !current.settings.fiscalReviewed || current.settings.publicOrigin !== origin) {
    await saveBillingSettings(db, actor, billingSettingsInput.parse({ publicOrigin: origin, enabled: true, fiscalReviewed: true, expectedVersion: current.settings.version }), runtime)
  }
  const pro: ProfileCapability[] = [...BASE_PROFILE_CAPABILITIES, 'profile.analytics', 'profile.scheduling']
  const premium: ProfileCapability[] = [...pro, 'profile.richBlocks', ...(runtime.delivered.has('profile.subdomain') ? ['profile.subdomain' as const] : [])]
  for (const [tier, amountCents, providerPriceId, capabilities] of [
    ['PRO', options.proAmountCents, options.proPriceId, pro],
    ['PREMIUM', options.premiumAmountCents, options.premiumPriceId, premium],
  ] as const) {
    const plan = current.plans.find(row => row.tier === tier), latest = plan?.versions[0]
    if (plan?.enabled && latest?.providerPriceId === providerPriceId && latest.amountCents === amountCents && latest.livemode === runtime.gateway?.livemode && JSON.stringify([...latest.capabilities].sort()) === JSON.stringify([...capabilities].sort())) continue
    await saveProfilePlan(db, actor, billingPlanInput.parse({ tier, amountCents, providerPriceId, capabilities, currency: 'BRL', interval: 'month', enabled: true, expectedVersion: plan?.version ?? 0 }), runtime)
  }
  const catalog = await billingCatalog(db, tenant.id, runtime)
  if (catalog.some(plan => !plan.available)) throw new Error('Os planos não estão disponíveis. Confira a configuração administrativa.')
  return catalog.map(({ tier, amountCents, available }) => ({ tier, amountCents, available }))
}

async function main() {
  const { values } = parseArgs({ options: {
    apply: { type: 'boolean' }, 'fiscal-reviewed': { type: 'boolean' }, host: { type: 'string' }, 'admin-email': { type: 'string' },
    'stripe-account': { type: 'string' }, 'pro-price': { type: 'string' }, 'pro-cents': { type: 'string' }, 'premium-price': { type: 'string' }, 'premium-cents': { type: 'string' },
  } })
  if (!values.apply || !values['fiscal-reviewed']) throw new Error('Confirme --apply e --fiscal-reviewed antes de configurar vendas.')
  if (!values['stripe-account'] || !env.STRIPE_BILLING_SECRET_KEY) throw new Error('Informe a conta Stripe e configure a chave de assinaturas.')
  if (env.NODE_ENV !== 'production' || !/^(sk|rk)_live_/.test(env.STRIPE_BILLING_SECRET_KEY)) throw new Error('Este comando exige produção e uma chave Stripe em modo real.')
  const account = await new Stripe(env.STRIPE_BILLING_SECRET_KEY, { timeout: 8000, maxNetworkRetries: 0, telemetry: false }).accounts.retrieve(null)
  if (account.id !== values['stripe-account'] || !account.charges_enabled) throw new Error('A conta Stripe não corresponde à conta aprovada ou não pode cobrar.')
  console.log(JSON.stringify(await configureProfilePlans(prisma, optionsSchema.parse({
    host: values.host, adminEmail: values['admin-email'], fiscalReviewed: values['fiscal-reviewed'],
    proPriceId: values['pro-price'], premiumPriceId: values['premium-price'],
    proAmountCents: Number(values['pro-cents']), premiumAmountCents: Number(values['premium-cents']),
  }), profileBillingRuntime())))
}

if (require.main === module) void main().catch(error => { console.error(error instanceof Error ? error.message : 'Não foi possível configurar os planos.'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
