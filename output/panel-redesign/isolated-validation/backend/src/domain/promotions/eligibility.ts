import type { Surface } from './price-for'

export function assertCheckout(input: {
  account: 'ACTIVE' | 'BANNED'
  link: 'PUBLISHED' | 'PENDING_MODERATION' | 'UNAVAILABLE'
  requiresAge: boolean
  surfaces: Surface[]
  activeSurfaces: string[]
  pendingSurfaces: string[]
}): true {
  if (input.account !== 'ACTIVE') throw new Error('conta')
  if (input.link !== 'PUBLISHED') throw new Error('link')
  const wantsHome = input.surfaces.includes('HOME')
  if (input.requiresAge && wantsHome) throw new Error('HOME')
  const blocked = input.surfaces.find((surface) =>
    input.activeSurfaces.includes(surface) || input.pendingSurfaces.includes(surface))
  if (blocked && input.activeSurfaces.includes(blocked)) throw new Error(blocked)
  if (blocked) throw new Error('pendente')
  const key = [...input.surfaces].sort().join('+')
  const allowed = new Set(['SEARCH', 'NICHE', 'HOME', 'NICHE+SEARCH', 'HOME+NICHE+SEARCH'])
  if (!allowed.has(key)) throw new Error('Combinação não está disponível')
  return true
}
