import { api } from '@/lib/api'
export type DiscoveredProfile = { id: string; slug: string | null; name: string; bio: string; avatarUrl: string | null; niche: { id: string; name: string } | null; sponsored: boolean; following: boolean; available?: boolean }
export type DirectoryResult = { profiles: DiscoveredProfile[]; niches: Array<{ id: string; name: string }>; nextCursor: string | null }
export type DiscoverySettings = { enabled: boolean; nicheId: string | null; version: number; niches: DirectoryResult['niches'] }
export async function directoryRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if(path.startsWith('profiles')||path.startsWith('me/followed-profiles'))init={...init,headers:{...Object.fromEntries(new Headers(init?.headers).entries()),'x-workspace-owner':'self'}}
  const response = await api<T & { message?: string }>('/v1/' + path, init).catch(() => { throw new Error('Sem conexão. Tente novamente.') })
  if (response.status !== 200) throw new Error(response.status === 401 ? 'Entre na sua conta para seguir páginas.' : response.body.message ?? 'Não foi possível atualizar. Tente novamente.')
  return response.body
}
