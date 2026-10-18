import { api } from '@/lib/api'
export async function billingRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let result: Awaited<ReturnType<typeof api<T & {message?:string}>>>
  try { result = await api<T & {message?:string}>('/v1' + path,init) }
  catch { throw new Error('Sem conexão. Atualize a situação antes de tentar novamente.') }
  if (result.status < 200 || result.status >= 300) throw new Error(result.body.message ?? 'Não foi possível concluir. Atualize a situação.')
  return result.body
}
