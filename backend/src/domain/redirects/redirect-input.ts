import { z } from 'zod'

export const redirectHandle = z.string().uuid()
const destinationUrl = z.string().trim().min(1).max(2048).url().refine(raw => {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
  } catch { return false }
}, 'Use uma URL HTTPS sem credenciais ou portas especiais.')
export const destinationInput = z.object({
  destinationUrl,
  label: z.string().trim().min(1).max(100),
  requiresAge: z.boolean().default(false),
  expectedRevision: z.number().int().min(0).max(2147483646),
  requestKey: z.string().uuid(),
}).strict()
export const createRedirectInput = destinationInput.extend({ expectedRevision: z.literal(0) })
export type DestinationInput = z.infer<typeof destinationInput>
