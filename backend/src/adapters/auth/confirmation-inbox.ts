const codes = new Map<string, string>()

export function confirmationInboxEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CONFIRMATION_INBOX === '1' && env.NODE_ENV !== 'production'
}

export function stashConfirmation(userId: string, kind: 'EMAIL' | 'PHONE', code: string): void {
  if (!confirmationInboxEnabled()) return
  codes.set(`${userId}:${kind}`, code)
}

export function readConfirmation(userId: string, kind: 'EMAIL' | 'PHONE'): string | null {
  if (!confirmationInboxEnabled()) return null
  return codes.get(`${userId}:${kind}`) ?? null
}

export function resetConfirmationInboxForTest(): void {
  codes.clear()
}
