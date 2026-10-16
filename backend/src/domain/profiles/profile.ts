const RESERVED_SLUGS = new Set(['admin', 'api', 'painel', 'login', 'cadastro', 'suporte', 'temlinkaqui'])

/** Identity within the originating tenant; uniqueness must also be enforced by PostgreSQL. */
export function profileSlug(input: string): string {
  const slug = input.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/.test(slug) || RESERVED_SLUGS.has(slug)) {
    throw new Error('Use um endereço de 3 a 40 letras sem acentos, números ou hífens, sem nome reservado.')
  }
  return slug
}

/** A reorder cannot add, remove or duplicate identities. The caller owns membership authorization. */
export function orderIds(current: readonly string[], requested: readonly string[]): string[] {
  const members = new Set(current)
  if (members.size !== current.length || requested.length !== current.length || new Set(requested).size !== requested.length || requested.some(id => !members.has(id))) {
    throw new Error('A ordem precisa conter cada item atual exatamente uma vez.')
  }
  return [...requested]
}
