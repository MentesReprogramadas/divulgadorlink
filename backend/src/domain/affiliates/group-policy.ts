import { createHash } from 'node:crypto'
import { z } from 'zod'

export const groupPolicyInput = z.object({
  enabled:z.boolean(),
  disappearingSeconds:z.union([z.literal(0),z.literal(86400),z.literal(604800),z.literal(7776000)]),
  joinApproval:z.boolean(),
  autoApproveDelaySeconds:z.number().int().min(120).max(86400),
}).strict()
export type AffiliateGroupPolicy = z.infer<typeof groupPolicyInput>
export const admissionJid = z.string().regex(/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/).max(100)
export function groupPolicyHash(policy:AffiliateGroupPolicy) {
  return createHash('sha256').update(JSON.stringify([policy.disappearingSeconds,policy.joinApproval])).digest('hex')
}
export function segmentGroupPolicy(segment:{groupPolicyEnabled:boolean;groupDisappearingSeconds:number;groupJoinApproval:boolean;groupAutoApproveDelaySeconds:number}) {
  return groupPolicyInput.parse({enabled:segment.groupPolicyEnabled,disappearingSeconds:segment.groupDisappearingSeconds,joinApproval:segment.groupJoinApproval,autoApproveDelaySeconds:segment.groupAutoApproveDelaySeconds})
}
