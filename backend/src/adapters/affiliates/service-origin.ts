import { env } from '@/env'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'

export function affiliateServiceOrigin(raw: string, allowDocker = false): URL {
  let url: URL
  try { url = new URL(raw) } catch { throw new AffiliateCatalogError(503, 'O endereço do serviço de afiliados precisa ser corrigido no servidor.') }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  const localDevelopment = env.NODE_ENV !== 'production' && url.protocol === 'http:' && loopback
  if ((env.NODE_ENV === 'production' && loopback) || (url.protocol !== 'https:' && !localDevelopment && !(allowDocker && url.origin === 'http://affiliate:8080')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new AffiliateCatalogError(503, 'A conexão com o serviço de afiliados precisa ser protegida no servidor.')
  return url
}
