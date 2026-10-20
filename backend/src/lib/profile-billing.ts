import {profileHostBases} from '@/domain/profiles/profile-host'
import Stripe from 'stripe-billing'
import type { PrismaClient } from '@prisma/client'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { StripeBillingGateway } from '@/adapters/billing/stripe-billing-gateway'
import { DELIVERED_PROFILE_CAPABILITIES } from '@/domain/billing/billing-delivery'
import type { BillingRuntime } from '@/repositories/profile-billing-repository'

let testDb: PrismaClient | null = null, testRuntime: BillingRuntime | null = null
let configured: BillingRuntime | null = null
export function profileBillingDb() { return testDb ?? prisma }
export function profileBillingRuntime(): BillingRuntime {
  if (testRuntime) return testRuntime
  if (configured) return configured
  const key = env.STRIPE_BILLING_SECRET_KEY
  const client = key && /^(sk|rk)_(test|live)_/.test(key) ? new Stripe(key, { timeout: 8000, maxNetworkRetries: 0, telemetry: false, appInfo: { name: 'Tem Link Aqui Profiles' } }) : null
  configured = {
    enabled: env.PROFILE_BILLING_SALES_ENABLED === '1', production: env.NODE_ENV === 'production',
    gateway: client ? new StripeBillingGateway(client, env.STRIPE_BILLING_WEBHOOK_SECRET ?? '', Boolean(key?.startsWith('sk_live_') || key?.startsWith('rk_live_'))) : null,
    webhookReady: Boolean(env.STRIPE_BILLING_WEBHOOK_SECRET), delivered:Object.keys(profileHostBases(process.env.PROFILE_HOST_BASES,env.NODE_ENV==='production')).length?DELIVERED_PROFILE_CAPABILITIES:new Set([...DELIVERED_PROFILE_CAPABILITIES].filter(key=>key!=='profile.subdomain')),
  }
  return configured
}
/** Test/E2E entry points may compose a local provider. No HTTP route can call this. */
export function setProfileBillingForTest(db: PrismaClient | null, runtime: BillingRuntime | null) {
  if (env.NODE_ENV === 'production') throw new Error('Test composition is unavailable in production')
  testDb = db; testRuntime = runtime
}
