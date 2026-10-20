export function panelGate(
  session: { status: string; canSubmit: boolean } | null,
  path: string,
): 'login' | 'verify' | 'redirect-verify' | 'panel' {
  if (!session) return 'login'
  if (session.status === 'BANNED') return 'panel'
  if (path === '/painel/verificar') return 'verify'
  if (!session.canSubmit) return 'redirect-verify'
  return 'panel'
}

export function afterAuth(canSubmit: boolean, status?: string, returnTo?: string): string {
  if (status === 'BANNED') return '/painel'
  if (!canSubmit) return '/painel/verificar'
  if(returnTo&&/^\/equipe\/convite\?token=[A-Za-z0-9_-]{43}$/.test(returnTo))return returnTo
  return returnTo && /^\/painel\/denunciar\/[a-zA-Z0-9_-]{1,100}$/.test(returnTo) ? returnTo : '/painel'
}
