import { z } from 'zod'

const required = z.string().regex(/^[a-zA-Z0-9._~-]{1,80}$/)
const optional = z.string().regex(/^[a-zA-Z0-9._~-]{0,80}$/)

const touchSchema = z.object({
  source: required,
  medium: required,
  campaign: required,
  content: optional,
  term: optional,
  landingPath: z.literal('/divulgar'),
}).strict()

export type Touch = z.infer<typeof touchSchema>

export function parseTouch(raw: string | undefined): Touch | null {
  if (!raw) return null
  const candidates = [raw]
  try {
    candidates.push(decodeURIComponent(raw))
  } catch {
    // o cookie já veio decodificado
  }
  for (const candidate of candidates) {
    try {
      const parsed = touchSchema.safeParse(JSON.parse(candidate))
      if (parsed.success) return parsed.data
    } catch {
      // tenta o próximo formato
    }
  }
  return null
}
