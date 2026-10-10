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

export function afterAuth(canSubmit: boolean): string {
  return canSubmit ? '/painel' : '/painel/verificar'
}
