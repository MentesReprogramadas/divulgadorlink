import { api } from '@/lib/api'
export class RedirectRequestError extends Error {
  constructor(message: string, readonly resource?: { id: string; version: number }, readonly status?: number) { super(message) }
}
export async function redirectRequest<T>(path = '', init?: RequestInit): Promise<T> {
  const result = await api<T & { message?: string; resource?: { id: string; version: number } }>('/v1/me/redirects' + path, init).catch(() => { throw new RedirectRequestError('Sem conexão. Os campos foram mantidos; tente novamente.') })
  if (result.status !== 200) throw new RedirectRequestError(result.body.message ?? 'Não foi possível carregar o link permanente. Tente novamente.', result.body.resource, result.status)
  return result.body
}
