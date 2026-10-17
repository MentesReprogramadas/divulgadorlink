import { z } from 'zod'
export const appearanceInput = z.object({
  background: z.string().regex(/^#[0-9a-f]{6}$/i), buttonColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  backgroundStyle: z.enum(['solid', 'gradient']), buttonStyle: z.enum(['filled', 'outline', 'shadow']),
  radius: z.enum(['square', 'rounded', 'pill']), font: z.enum(['modern', 'classic', 'clean']), alignment: z.enum(['center', 'left']),
}).strict()
export type ProfileAppearance = z.infer<typeof appearanceInput>
