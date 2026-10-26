export const MIN_TEXT = 80
export const MAX_SUMMARY = 500

export type Robots = 'index,follow' | 'noindex,follow' | 'noindex,nofollow'

export function substantiveText(name: string, description: string): boolean {
  const text = description.trim()
  return text.length >= MIN_TEXT && text !== name.trim()
}

export function cleanSummary(summary: string | null | undefined): string | null {
  const text = summary?.trim() ?? ''
  return text ? text : null
}

export function parseSummary(value: string | null): { ok: true; summary: string | null } | { ok: false } {
  if (value === null) return { ok: true, summary: null }
  const text = value.trim()
  if (!text) return { ok: true, summary: null }
  if (text.length > MAX_SUMMARY || text.includes('<')) return { ok: false }
  return { ok: true, summary: text }
}

export type FacetIndexInput = {
  isPublicFacet: boolean
  requiresAge: boolean
  eligibleCount?: number
  editorialApproved?: boolean
  hasPublicPreview?: boolean
}

export function facetIndexable(input: FacetIndexInput): boolean {
  return input.isPublicFacet && input.editorialApproved === true
    && Number.isInteger(input.eligibleCount) && (input.eligibleCount ?? 0) > 0
    && (!input.requiresAge || input.hasPublicPreview === true)
}

export function facetRobots(input: FacetIndexInput & { filtered: boolean }): Robots {
  if (!input.isPublicFacet || input.requiresAge && !input.hasPublicPreview) return 'noindex,nofollow'
  if (input.filtered || !facetIndexable(input)) return 'noindex,follow'
  return 'index,follow'
}

export function linkRobots(input: { blocked: boolean }): Robots {
  if (input.blocked) return 'noindex,nofollow'
  return 'index,follow'
}

export function documentTitle(kind: 'home' | 'named', name: string, tenant: string): string {
  if (kind === 'home') return tenant
  return `${name} | ${tenant}`
}

export function facetBlurb(kind: 'niche' | 'network', name: string, summary: string | null): string {
  return cleanSummary(summary)
    ?? (kind === 'niche'
      ? `Links de ${name} organizados por rede.`
      : `Links publicados em ${name}.`)
}
