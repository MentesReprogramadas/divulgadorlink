import { api } from '@/lib/api'
export async function profileRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await api<T & { message?: string }>('/v1/me/profile' + path, init).catch(() => { throw new Error('Sem conexão. Seus dados foram mantidos; tente novamente.') })
  if (r.status !== 200) throw new Error(r.body.message ?? 'Não foi possível carregar o perfil. Tente novamente.')
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
