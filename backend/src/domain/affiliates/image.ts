import { z } from 'zod'

export const affiliateImageReference = z.string().regex(/^affiliate-image:[a-f0-9-]{36}$/)
export function affiliateImageId(value:string) {
  return affiliateImageReference.safeParse(value).success ? value.slice('affiliate-image:'.length) : null
}
