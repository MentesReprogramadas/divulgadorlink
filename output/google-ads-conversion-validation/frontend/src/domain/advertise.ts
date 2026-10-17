export const AD_FORBIDDEN_PATTERN = /adulto|apostas|ganhar dinheiro|onlyfans|fansly|fatal model|privacy/i

export function advertiseCta(session: { canSubmit: boolean } | null): { href: string; label: string } {
  if (!session) return { href: '/cadastro', label: 'Publicar um link' }
  if (!session.canSubmit) return { href: '/painel/verificar', label: 'Confirmar e-mail' }
  return { href: '/painel/links/novo', label: 'Publicar um link' }
}
