import { appearanceInput } from './appearance'
import { z } from 'zod'
import { profileSlug, type ProfileContent } from './profile'
const id = z.string().uuid()
export const profileVersion = z.number().int().min(0).max(2147483646)
export const profileInput = z.object({
  appearance: appearanceInput.optional(),
  slug: z.string().max(80).transform((value, ctx) => { try { return profileSlug(value) } catch { ctx.addIssue({ code: 'custom', message: 'Endereço inválido ou reservado. Use 3 a 40 letras, números e hífens.' }); return z.NEVER } }),
  name: z.string().trim().min(1).max(80), bio: z.string().trim().max(500), avatarAssetId: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  requiresAge: z.boolean(), primaryItemId: id.nullable(),
  categories: z.array(z.object({ id, name: z.string().trim().min(1).max(80), visible: z.boolean() }).strict()).max(100),
  items: z.array(z.object({ id, categoryId: id, type: z.enum(['URL', 'CATALOG', 'SOCIAL']), label: z.string().trim().min(1).max(100), destination: z.string().trim().min(1).max(2048), visible: z.boolean() }).strict()).max(500),
}).strict().superRefine((value, ctx) => {
  const groups = new Set(value.categories.map(c => c.id)), items = new Set(value.items.map(i => i.id))
  if (groups.size !== value.categories.length || items.size !== value.items.length || value.items.some(i => !groups.has(i.categoryId)) || (value.primaryItemId !== null && !items.has(value.primaryItemId))) ctx.addIssue({ code: 'custom', message: 'Grupos e itens precisam de identificadores únicos e relações válidas.' })
}) satisfies z.ZodType<ProfileContent>
