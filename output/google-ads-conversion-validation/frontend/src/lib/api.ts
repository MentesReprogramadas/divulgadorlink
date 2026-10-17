import { loadSession, readCsrf, type Session } from '@/domain/session'

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCsrf()
    if (csrf && !headers.has('x-csrf-token')) headers.set('x-csrf-token', csrf)
  }
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return fetch(`/bff${path}`, { ...init, headers, credentials: 'include' })
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  let response = await send(path, init)
  if (response.status === 401 && (!path.startsWith('/v1/auth/') || path === '/v1/auth/session')) {
    const refreshed = await send('/v1/auth/refresh', { method: 'POST' })
    if (refreshed.ok) response = await send(path, init)
  }
  const text = await response.text()
  const body = text ? JSON.parse(text) as T : {} as T
  return { status: response.status, body }
}

export function currentSession(): Promise<Session | null> {
  return loadSession(() => api<Partial<Session>>('/v1/auth/session'))
}
