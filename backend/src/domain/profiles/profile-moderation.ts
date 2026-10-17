import { canonicalUrl } from '@/domain/links/canonical-url'
import type { ProfileContent } from './profile'

export type ProfileModerationContext = {
  approved?: { name: string; description: string }
  changedFields: string[]
  destinations: string[]
}

const textKey = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pt-BR')
const destinationKey = (item: ProfileContent['items'][number]) => item.type + ':' + (item.type === 'CATALOG' ? item.destination : canonicalUrl(item.destination))
export const profileModerationText = (content: ProfileContent) => [content.name, content.bio, ...content.categories.map(group => group.name), ...content.items.map(item => item.label)].join('\n')

/** Approval concerns content, not record IDs, ordering or presentation. */
export function profileModerationChanges(content: ProfileContent, approved?: ProfileContent) {
  if (!approved) return { changedFields: ['primeira publicação'], text: profileModerationText(content) }
  const changedFields: string[] = [], text: string[] = []
  for (const [field, label] of [['name', 'nome'], ['bio', 'descrição']] as const) {
    if (textKey(content[field]) !== textKey(approved[field])) { changedFields.push(label); text.push(content[field]) }
  }
  if (content.slug !== approved.slug) { changedFields.push('endereço da página'); text.push(content.slug) }
  if (content.avatarAssetId !== approved.avatarAssetId) changedFields.push('foto')
  if (content.requiresAge !== approved.requiresAge) changedFields.push('restrição de idade')
  const names = new Set(approved.categories.map(group => textKey(group.name)))
  for (const group of content.categories) if (!names.has(textKey(group.name))) { changedFields.push('nome de grupo'); text.push(group.name) }
  const links = new Map<string, Set<string>>()
  for (const item of approved.items) {
    const key = destinationKey(item), labels = links.get(key) ?? new Set<string>()
    labels.add(textKey(item.label)); links.set(key, labels)
  }
  for (const item of content.items) {
    const labels = links.get(destinationKey(item))
    if (!labels) { changedFields.push('destino ou tipo de link'); text.push(item.label) }
    else if (!labels.has(textKey(item.label))) { changedFields.push('título de link'); text.push(item.label) }
  }
  return { changedFields: [...new Set(changedFields)], text: text.join('\n') }
}
