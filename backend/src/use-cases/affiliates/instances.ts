import type { AffiliateInstance } from '@prisma/client'
import { AffiliateEvolution } from '@/adapters/affiliates/evolution'
import { env } from '@/env'
import { openWebhookSecret } from '@/lib/webhook-secret'
import { affiliateInviteReadCache } from '@/adapters/affiliates/invite-read-cache'

function evolutionConfig(instance:AffiliateInstance) {
  return {baseUrl:env.AFFILIATE_EVOLUTION_BASE_URL ?? env.EVOLUTION_BASE_URL ?? '',apiKey:instance.secret ? openWebhookSecret(instance.secret,env.WEBHOOK_ENCRYPTION_KEY,`affiliate-instance:${instance.tenantId}:${instance.name}`) : env.AFFILIATE_EVOLUTION_API_KEY ?? '',instance:instance.name,ownerPhone:instance.ownerPhone}
}
export function affiliateEvolution(instance:AffiliateInstance) {
  return new AffiliateEvolution(evolutionConfig(instance))
}
export function affiliateInviteEvolution(instance:AffiliateInstance) {
  const config=evolutionConfig(instance)
  const scope=JSON.stringify([instance.tenantId,instance.id,instance.updatedAt.toISOString(),config.baseUrl,config.apiKey])
  return new AffiliateEvolution(config,fetch,affiliateInviteReadCache(scope))
}
export function publicInstance(instance:AffiliateInstance) {
  const {secret,...safe} = instance
  return {...safe,configured:Boolean(env.AFFILIATE_EVOLUTION_BASE_URL ?? env.EVOLUTION_BASE_URL) && Boolean(secret || env.AFFILIATE_EVOLUTION_API_KEY)}
}
