import type { AffiliateInstance } from '@prisma/client'
import { AffiliateEvolution } from '@/adapters/affiliates/evolution'
import { env } from '@/env'
import { openWebhookSecret } from '@/lib/webhook-secret'

export function affiliateEvolution(instance:AffiliateInstance) {
  return new AffiliateEvolution({baseUrl:env.AFFILIATE_EVOLUTION_BASE_URL ?? env.EVOLUTION_BASE_URL ?? '',apiKey:instance.secret ? openWebhookSecret(instance.secret,env.WEBHOOK_ENCRYPTION_KEY,`affiliate-instance:${instance.tenantId}:${instance.name}`) : env.AFFILIATE_EVOLUTION_API_KEY ?? '',instance:instance.name,ownerPhone:instance.ownerPhone})
}
export function publicInstance(instance:AffiliateInstance) {
  const {secret,...safe} = instance
  return {...safe,configured:Boolean(env.AFFILIATE_EVOLUTION_BASE_URL ?? env.EVOLUTION_BASE_URL) && Boolean(secret || env.AFFILIATE_EVOLUTION_API_KEY)}
}
