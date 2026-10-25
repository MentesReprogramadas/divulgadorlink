import {contentBlockText} from './content-block'
import { canonicalUrl } from '@/domain/links/canonical-url'
import type { ProfileContent } from './profile'
import {translationTexts,type ProfileTranslations} from './profile-translations'
import { hitsBlocklist } from '@/domain/links/blocklist'

type ModerationSnapshot = {
  contentBlocks?:ProfileContent['contentBlocks']
  buttonTest?:ProfileContent['buttonTest']
  translations?:ProfileTranslations
  name: string; description: string; slug: string; requiresAge: boolean; avatarAssetId: string | null
  groups: Array<{ id: string; name: string }>
  links: Array<{ id: string; groupId: string; type: string; label: string; destination: string; event?:ProfileContent['items'][number]['event'] }>
}

export type ProfileModerationContext = {
  approved?: { name: string; description: string; snapshot?: ModerationSnapshot }
  proposed?: ModerationSnapshot
  changedFields: string[]
  destinations: string[]
}

const textKey = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pt-BR')
// Punctuation alone introduces no subject, destination or instruction.
const punctuationOnly = (value: string) => /^[\p{P}\s]*$/u.test(value.normalize('NFKC'))
const destinationKey = (item: ProfileContent['items'][number]) => item.type + ':' + (item.type === 'CATALOG' ? item.destination : canonicalUrl(item.destination))
export const profileModerationText = (content: ProfileContent) => [contentBlockText(content.contentBlocks??[]),content.name, content.bio, ...content.categories.map(group => group.name), ...content.items.flatMap(item => [item.label,...(item.event?[item.event.description,item.event.location,item.event.buttonLabel??'Acessar evento']:[])]),...(content.buttonTest?.labels??[]),...translationTexts(content)].join('\n')

export function profileModerationSnapshot(content: ProfileContent): ModerationSnapshot {
  return {
    ...(content.contentBlocks?{contentBlocks:content.contentBlocks}:{}),...(content.buttonTest?{buttonTest:content.buttonTest}:{}),...(content.translations?{translations:content.translations}:{}),
    name: content.name, description: content.bio, slug: content.slug, requiresAge: content.requiresAge, avatarAssetId: content.avatarAssetId,
    groups: content.categories.map(group => ({ id: group.id, name: group.name })),
    links: content.items.map(item => ({ id: item.id, groupId: item.categoryId, type: item.type, label: item.label, destination: item.type === 'CATALOG' ? item.destination : canonicalUrl(item.destination),...(item.event?{event:item.event}:{}) })),
  }
}

/** Reused signals still reach the contextual model, but do not force the human queue again. */
export function profileHasNewBlockedSignals(text: string, terms: string[], approved?: ProfileContent): boolean {
  if (!approved) return hitsBlocklist({ text, terms, selectedNiche: '', nicheNames: [] })
  const baseline = profileModerationText(approved)
  const newTerms = terms.filter(term => !baseline.toLowerCase().includes(term.toLowerCase()))
  const signals = /https?:\/\/[^\s]+|www\.[^\s]+|(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/gi
  const knownSignals = new Set(baseline.match(signals) ?? [])
  const introducedText = text.replace(signals, signal => knownSignals.has(signal) ? '' : signal)
  return hitsBlocklist({ text: introducedText, terms: newTerms, selectedNiche: '', nicheNames: [] })
}

/** Approval concerns content, not record IDs, ordering or presentation. */
export function profileModerationChanges(content: ProfileContent, approved?: ProfileContent) {
  if (!approved) return { changedFields: ['primeira publicação'], text: profileModerationText(content) }
  const changedFields: string[] = [], text: string[] = []
  if(JSON.stringify(content.contentBlocks??[])!==JSON.stringify(approved.contentBlocks??[])){changedFields.push('blocos de conteúdo');text.push(contentBlockText(content.contentBlocks??[]))}
  if(JSON.stringify(content.buttonTest??null)!==JSON.stringify(approved.buttonTest??null)&&content.buttonTest){changedFields.push('versões do botão');text.push(...content.buttonTest.labels)}
  if(JSON.stringify(content.translations??null)!==JSON.stringify(approved.translations??null)&&translationTexts(content).length){changedFields.push('traduções');text.push(...translationTexts(content))}
  for (const [field, label] of [['name', 'nome'], ['bio', 'descrição']] as const) {
    if (textKey(content[field]) !== textKey(approved[field])) { changedFields.push(label); text.push(content[field]) }
  }
  if (content.slug !== approved.slug) { changedFields.push('endereço da página'); text.push(content.slug) }
  if (content.avatarAssetId !== approved.avatarAssetId) changedFields.push('foto')
  if (content.requiresAge !== approved.requiresAge) changedFields.push('restrição de idade')
  const names = new Set(approved.categories.map(group => textKey(group.name)))
  for (const group of content.categories) if (!names.has(textKey(group.name)) && !punctuationOnly(group.name)) { changedFields.push('nome de grupo'); text.push(group.name) }
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
  for(const item of content.items){const old=approved.items.find(prior=>prior.id===item.id)?.event;if(item.event&&(item.event.description!==old?.description||item.event.location!==old?.location||(item.event.buttonLabel??'Acessar evento')!==(old?.buttonLabel??'Acessar evento'))){changedFields.push('dados do evento');text.push(item.event.description,item.event.location,item.event.buttonLabel??'Acessar evento')}}
  return { changedFields: [...new Set(changedFields)], text: text.join('\n') }
}
