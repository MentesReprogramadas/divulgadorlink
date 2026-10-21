import type {ButtonTestConfig} from './button-test'
import type {EventBlock} from './event-block'
import {pruneTranslations,type ProfileTranslations} from './profile-translations'
import type { ProfileAppearance } from './appearance'
import { nextScheduleBoundary, scheduleState, type ProfileSchedule } from './profile-schedule'
const RESERVED_SLUGS = new Set(['admin', 'api', 'painel', 'login', 'cadastro', 'suporte', 'temlinkaqui'])

export class ProfileError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

/** Public projection: never send hidden/future destinations or private schedule settings. */
export function profileAt(content: ProfileContent, eligibleCatalog: ReadonlySet<string>, now: Date, schedulingAllowed: boolean) {
  const eligible = visibleProfile(content, eligibleCatalog)
  const nextBoundary = schedulingAllowed ? nextScheduleBoundary(eligible.items.map(item => item.schedule), now) : null
  const items = eligible.items.filter(item => scheduleState(item.schedule, now, schedulingAllowed) === 'VISIBLE').map(item => ({ id: item.id, categoryId: item.categoryId, type: item.type, label: item.label, destination: item.destination, visible: item.visible, ...(item.event?{event:item.event}:{}) }))
  const categories=eligible.categories.filter(category=>items.some(item=>item.categoryId===category.id))
  return { content: { ...eligible,...(eligible.translations?{translations:pruneTranslations(eligible.translations,categories,items)}:{}), categories, items, primaryItemId: items.some(item => item.id === content.primaryItemId) ? content.primaryItemId : null }, nextBoundary }
}
export type ProfileContent = {
  buttonTest?:ButtonTestConfig|null
  translations?:ProfileTranslations
  appearance?: ProfileAppearance
  slug: string; name: string; bio: string; avatarAssetId: string | null; requiresAge: boolean; primaryItemId: string | null
  categories: Array<{ id: string; name: string; visible: boolean }>
  items: Array<{ id: string; categoryId: string; type: 'URL' | 'CATALOG' | 'SOCIAL'; label: string; destination: string; visible: boolean; event?:EventBlock; schedule?: ProfileSchedule | null; templateExample?: boolean }>
}
export function visibleProfile(content: ProfileContent, eligibleCatalog: ReadonlySet<string>): ProfileContent {
  const categories = content.categories.filter(c => c.visible).map(c => ({ id: c.id, name: c.name, visible: true }))
  const groups = new Set(categories.map(c => c.id))
  const items = content.items.filter(i => i.visible && !i.templateExample && groups.has(i.categoryId) && (i.type !== 'CATALOG' || eligibleCatalog.has(i.destination)))
    .map(i => ({ id: i.id, categoryId: i.categoryId, type: i.type, label: i.label, destination: i.destination, visible: true, ...(i.event?{event:i.event}:{}), ...(i.schedule ? { schedule: i.schedule } : {}) }))
  return { ...(content.appearance ? { appearance: content.appearance } : {}),...(content.translations?{translations:pruneTranslations(content.translations,categories,items)}:{}), slug: content.slug, name: content.name, bio: content.bio, avatarAssetId: content.avatarAssetId, requiresAge: content.requiresAge, primaryItemId: items.some(i => i.id === content.primaryItemId) ? content.primaryItemId : null, categories, items }
}

/** Identity within the originating tenant; uniqueness must also be enforced by PostgreSQL. */
export function profileSlug(input: string): string {
  const slug = input.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/.test(slug) || RESERVED_SLUGS.has(slug)) {
    throw new Error('Use um endereço de 3 a 40 letras sem acentos, números ou hífens, sem nome reservado.')
  }
  return slug
}
