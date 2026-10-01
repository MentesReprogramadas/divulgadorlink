export type Session = { role: string; status: string; canSubmit: boolean }

const KEY = 'catalogo.session'

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Session> & { token?: unknown }
    if (typeof parsed.role !== 'string' || typeof parsed.status !== 'string') return null
    return { role: parsed.role, status: parsed.status, canSubmit: Boolean(parsed.canSubmit) }
  } catch {
    return null
  }
}

export function writeSession(session: Session): void {
  window.sessionStorage.setItem(KEY, JSON.stringify({
    role: session.role,
    status: session.status,
    canSubmit: session.canSubmit,
  }))
}

export function clearSession(): void {
  window.sessionStorage.removeItem(KEY)
  document.cookie = 'catalogo_role=; Path=/; Max-Age=0'
}

export async function loadSession(
  fetchSession: () => Promise<{ status: number; body: Partial<Session> }>,
): Promise<Session | null> {
  const result = await fetchSession()
  if (result.status !== 200 || typeof result.body.role !== 'string' || typeof result.body.status !== 'string') {
    clearSession()
    return null
  }
  const session = { role: result.body.role, status: result.body.status, canSubmit: Boolean(result.body.canSubmit) }
  writeSession(session)
  return session
}

export function readCsrf(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split('; ').find((part) => part.startsWith('csrf='))
  return match ? decodeURIComponent(match.slice('csrf='.length)) : ''
}
