import {buttonTestInput} from './button-test'
import {eventBlockInput} from './event-block'
import {profileTranslationInput,pruneTranslations} from './profile-translations'
import { appearanceInput } from './appearance'
import { z } from 'zod'
import { profileSlug, type ProfileContent } from './profile'
import { profileScheduleInput } from './profile-schedule'
const id = z.string().uuid()
export const profileVersion = z.number().int().min(0).max(2147483646)
export const profileInput = z.object({
  buttonTest:buttonTestInput.nullable().optional(),
  translations:profileTranslationInput.optional(),
  appearance: appearanceInput.optional(),
  slug: z.string().max(80).transform((value, ctx) => { try { return profileSlug(value) } catch { ctx.addIssue({ code: 'custom', message: 'Endereço inválido ou reservado. Use 3 a 40 letras, números e hífens.' }); return z.NEVER } }),
  name: z.string().trim().min(1).max(80), bio: z.string().trim().max(500), avatarAssetId: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  requiresAge: z.boolean(), primaryItemId: id.nullable(),
  categories: z.array(z.object({ id, name: z.string().trim().min(1).max(80), visible: z.boolean() }).strict()).max(100),
  items: z.array(z.object({ id, categoryId: id, type: z.enum(['URL', 'CATALOG', 'SOCIAL']), label: z.string().trim().min(1).max(100), destination: z.string().trim().min(1).max(2048), visible: z.boolean(), event:eventBlockInput.optional(), schedule: profileScheduleInput.nullable().optional().transform(value => value ?? undefined), templateExample: z.boolean().optional().transform(value=>value||undefined) }).strict()).max(500),
}).strict().superRefine((value, ctx) => {
  if(value.items.some(item=>item.event&&item.type!=='URL'))ctx.addIssue({code:'custom',message:'Eventos precisam de um link HTTPS de inscrição ou detalhes.'})
  for(const translation of value.translations?.entries??[])for(const item of value.items)if(item.event&&(translation.items[item.id]?.length??0)>40)ctx.addIssue({code:'custom',message:'O texto traduzido do botão do evento deve ter até 40 caracteres.'})
  const groups = new Set(value.categories.map(c => c.id)), items = new Set(value.items.map(i => i.id))
  if (groups.size !== value.categories.length || items.size !== value.items.length || value.items.some(i => !groups.has(i.categoryId)) || (value.primaryItemId !== null && !items.has(value.primaryItemId))) ctx.addIssue({ code: 'custom', message: 'Grupos e itens precisam de identificadores únicos e relações válidas.' })
}).transform(value=>({...value,...(value.buttonTest&&!value.items.some(item=>item.id===value.buttonTest!.blockId&&!item.event&&!item.templateExample)?{buttonTest:null}:{}),...(value.translations?{translations:pruneTranslations(value.translations,value.categories,value.items)}:{})})) satisfies z.ZodType<ProfileContent>
