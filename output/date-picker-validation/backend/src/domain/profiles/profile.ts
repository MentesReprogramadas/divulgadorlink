import type { ProfileAppearance } from './appearance'
const RESERVED_SLUGS = new Set(['admin', 'api', 'painel', 'login', 'cadastro', 'suporte', 'temlinkaqui'])

export class ProfileError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}
export type ProfileContent = {
  appearance?: ProfileAppearance
  slug: string; name: string; bio: string; avatarAssetId: string | null; requiresAge: boolean; primaryItemId: string | null
  categories: Array<{ id: string; name: string; visible: boolean }>
  items: Array<{ id: string; categoryId: string; type: 'URL' | 'CATALOG' | 'SOCIAL'; label: string; destination: string; visible: boolean }>
}
export function visibleProfile(content: ProfileContent, eligibleCatalog: ReadonlySet<string>): ProfileContent {
  const categories = content.categories.filter(c => c.visible).map(c => ({ id: c.id, name: c.name, visible: true }))
  const groups = new Set(categories.map(c => c.id))
  const items = content.items.filter(i => i.visible && groups.has(i.categoryId) && (i.type !== 'CATALOG' || eligibleCatalog.has(i.destination)))
    .map(i => ({ id: i.id, categoryId: i.categoryId, type: i.type, label: i.label, destination: i.destination, visible: true }))
  return { ...(content.appearance ? { appearance: content.appearance } : {}), slug: content.slug, name: content.name, bio: content.bio, avatarAssetId: content.avatarAssetId, requiresAge: content.requiresAge, primaryItemId: items.some(i => i.id === content.primaryItemId) ? content.primaryItemId : null, categories, items }
}

/** Identity within the originating tenant; uniqueness must also be enforced by PostgreSQL. */
export function profileSlug(input: string): string {
  const slug = input.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/.test(slug) || RESERVED_SLUGS.has(slug)) {
    throw new Error('Use um endereço de 3 a 40 letras sem acentos, números ou hífens, sem nome reservado.')
  }
  return slug
}
