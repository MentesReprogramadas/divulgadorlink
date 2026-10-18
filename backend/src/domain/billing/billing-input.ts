import { z } from 'zod'
import { PROFILE_CAPABILITIES, billingReturnPath, validateProfilePlan } from './profile-plans'

export class BillingError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 503, message: string) { super(message) }
}
export const billingExpectedVersion = z.number().int().min(0).max(2147483646)
export const billingRequestKey = z.string().uuid()
export const billingCheckoutInput = z.object({
  planVersionId: z.string().uuid(),
  returnPath: z.string().max(120).optional().transform((value, ctx) => {
    try { return billingReturnPath(value) } catch { ctx.addIssue({ code: 'custom', message: 'Retorno inválido.' }); return z.NEVER }
  }),
}).strict()
export const billingPlanInput = z.object({
  tier: z.enum(['PRO','PREMIUM']),
  amountCents: z.number().int().positive().max(2147483647),
  currency: z.literal('BRL'), interval: z.literal('month'),
  providerPriceId: z.string().regex(/^price_[a-zA-Z0-9_]{1,100}$/),
  capabilities: z.array(z.enum(PROFILE_CAPABILITIES)).min(5).max(PROFILE_CAPABILITIES.length),
  enabled: z.boolean(),
  expectedVersion: billingExpectedVersion,
}).strict().superRefine((value, ctx) => {
  if (!validateProfilePlan(value)) ctx.addIssue({ code: 'custom', message: 'Confira preço e recursos deste plano.' })
})
export const billingSettingsInput = z.object({
  publicOrigin: z.string().url().max(2048),
  enabled: z.boolean(), fiscalReviewed: z.boolean(), expectedVersion: billingExpectedVersion,
}).strict()
