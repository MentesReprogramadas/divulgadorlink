export function decideCase(input: {
  decision: 'APPROVE' | 'REJECT'
  url: string
  nextUrl?: string
  creatingNiche?: boolean
  nicheKind?: 'SCAM' | 'PERSONAL_DATA' | 'MINOR' | 'NORMAL'
  requiresAge?: boolean
  wasPublished?: boolean
}): { url: string; status: 'PUBLISHED' | 'PRE_REJECTED'; requiresAge: boolean; occupiesSlot: boolean } {
  if (input.creatingNiche && (input.nicheKind === 'SCAM' || input.nicheKind === 'PERSONAL_DATA' || input.nicheKind === 'MINOR')) {
    throw new Error('não vira nicho')
  }
  if (input.creatingNiche && typeof input.requiresAge !== 'boolean') {
    throw new Error('requiresAge explícito')
  }
  if (input.decision === 'REJECT') {
    return {
      url: input.url,
      status: input.wasPublished ? 'PUBLISHED' : 'PRE_REJECTED',
      requiresAge: false,
      occupiesSlot: input.wasPublished === true,
    }
  }
  return { url: input.url, status: 'PUBLISHED', requiresAge: input.requiresAge === true, occupiesSlot: true }
}
