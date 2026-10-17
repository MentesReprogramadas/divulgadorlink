export type Session = { role: string; status: string; canSubmit: boolean; banReason?: string }

const KEY = 'catalogo.session'
const NOTICE_KEY = 'catalogo.notice'
const NOTICE_EVENT = 'catalogo-notice'
export const SESSION_EVENT = 'catalogo-session'

function publishNotice(): void {
  window.dispatchEvent(new Event(NOTICE_EVENT))
}

export function pushNotice(text: string): void {
  window.sessionStorage.setItem(NOTICE_KEY, text)
  publishNotice()
}

export function readNotice(): string {
  return window.sessionStorage.getItem(NOTICE_KEY) ?? ''
}

export function clearNotice(): void {
  window.sessionStorage.removeItem(NOTICE_KEY)
  publishNotice()
}

export function subscribeNotice(onChange: () => void): () => void {
  window.addEventListener(NOTICE_EVENT, onChange)
  return () => window.removeEventListener(NOTICE_EVENT, onChange)
}

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Session> & { token?: unknown }
    if (typeof parsed.role !== 'string' || typeof parsed.status !== 'string') return null
    const session: Session = { role: parsed.role, status: parsed.status, canSubmit: Boolean(parsed.canSubmit) }
    if (typeof parsed.banReason === 'string' && parsed.banReason.trim()) session.banReason = parsed.banReason.trim()
    return session
  } catch {
    return null
  }
}

function rememberRole(role: string): void {
  if (role !== 'USER' && role !== 'ADMIN') return
  document.cookie = `catalogo_role=${role}; Path=/; SameSite=Lax`
}

export function writeSession(session: Session): void {
  const reason = session.banReason?.trim()
  window.sessionStorage.setItem(KEY, JSON.stringify({
    role: session.role,
    status: session.status,
    canSubmit: session.canSubmit,
    ...(reason ? { banReason: reason } : {}),
  }))
  rememberRole(session.role)
  window.dispatchEvent(new Event(SESSION_EVENT))
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
  const reason = typeof result.body.banReason === 'string' ? result.body.banReason.trim() : ''
  const session: Session = {
    role: result.body.role,
    status: result.body.status,
    canSubmit: Boolean(result.body.canSubmit),
    ...(reason ? { banReason: reason } : {}),
  }
  writeSession(session)
  return session
}

export function readCsrf(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.split('; ').find((part) => part.startsWith('csrf='))
  return match ? decodeURIComponent(match.slice('csrf='.length)) : ''
}
