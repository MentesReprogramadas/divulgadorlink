import { z } from 'zod'
export const discoveryInput = z.object({ enabled: z.boolean(), nicheId: z.string().min(1).max(100).nullable(), expectedVersion: z.number().int().min(0).max(2147483646) }).strict()
export const discoveryQuery = z.object({ q: z.string().trim().max(100).default(''), nicheId: z.string().max(100).optional(), cursor: z.string().uuid().optional(), followed: z.enum(['true']).optional() }).strict()
export function discoverable(input: { enabled: boolean; published: boolean; active: boolean; restricted: boolean; items: number }) {
  return input.enabled && input.published && input.active && !input.restricted && input.items > 0
}
