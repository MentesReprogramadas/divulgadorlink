import { api } from '@/lib/api'
import type { PublicProfile } from './profile-contract'
export async function publicProfileRequest(slug: string): Promise<PublicProfile> {
  const response=await api<PublicProfile>('/v1/profiles/'+encodeURIComponent(slug),{cache:'no-store'}).catch(()=>{throw new Error('Sem conexão. Tente novamente.')})
  if(response.status!==200)throw new Error('Não foi possível atualizar os links. Tente novamente.')
  return response.body
}
export class ProfileRequestError extends Error { constructor(message: string, public readonly status: number) { super(message) } }
export const isProfileVersionConflict = (reason: unknown) => reason instanceof ProfileRequestError && reason.status === 409 && reason.message.toLowerCase().includes('outra aba')
export async function profileRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await api<T & { message?: string }>('/v1/me/profile' + path, init).catch(() => { throw new Error('Sem conexão. Seus dados foram mantidos; tente novamente.') })
  if (r.status !== 200) throw new ProfileRequestError(r.body.message ?? 'Não foi possível carregar o perfil. Tente novamente.', r.status)
  return r.body
}
export async function profileCatalog() {
  const rows: Array<{ id: string; name: string; status: string }> = []
  for (let page = 1; ; page++) {
    const r = await api<{ links?: typeof rows; total?: number }>('/v1/links/mine?pageSize=24&page=' + page)
    if (r.status !== 200) throw new Error('Não foi possível carregar seus links do catálogo. Tente novamente.')
    const items = r.body.links ?? []; rows.push(...items)
    if (items.length < 24 || rows.length >= (r.body.total ?? Infinity)) break
  }
  return rows.filter(l => l.status === 'PUBLISHED')
}
