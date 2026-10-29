import { z } from 'zod'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { assertCatalogPath, readCatalogJson, type CatalogRequestMany } from './mercado-livre'
import { affiliateServiceOrigin } from './service-origin'

export type AffiliateCatalogGatewaySettings = { url?: string; key?: string }
export function affiliateCatalogGatewayEnabled(settings: AffiliateCatalogGatewaySettings): boolean { return Boolean(settings.url || settings.key) }

async function request(settings: AffiliateCatalogGatewaySettings, path: '/catalog/status' | '/catalog/request' | '/catalog/batch', body?: { path: string } | { paths: string[] }): Promise<unknown> {
  if (!settings.url || !settings.key) throw new AffiliateCatalogError(503, 'Complete a configuração do catálogo central no servidor.')
  const origin = affiliateServiceOrigin(settings.url)
  let response: Response
  try {
    response = await fetch(new URL(path, origin), { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${settings.key}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000) })
  } catch { throw new AffiliateCatalogError(502, 'O catálogo central não respondeu. Confira a conexão local do operador.') }
  if (!response.ok) {
    if (response.body) await response.body.cancel().catch(() => undefined)
    if (response.status === 404 && body && 'path' in body && /^\/products\/MLB\d+\/items\?/.test(body.path)) return { results: [], paging: { total: 0 } }
    if (response.status === 400) throw new AffiliateCatalogError(400, 'O Mercado Livre recusou esta página de resultados. A consulta anterior foi preservada.')
    if (path === '/catalog/batch' && [404, 405].includes(response.status)) throw new AffiliateCatalogError(404, 'Consulta em lote indisponível.')
    if (response.status === 400 && body && 'path' in body && body.path.startsWith('/products/search?')) throw new AffiliateCatalogError(400, 'O Mercado Livre recusou esta página. A cobertura do catálogo é parcial; consulte as páginas já coletadas.')
    if (response.status === 401) throw new AffiliateCatalogError(409, 'A conexão do catálogo central precisa ser renovada pelo operador.')
    if (response.status === 403) throw new AffiliateCatalogError(403, 'O catálogo central não liberou esta consulta. Confira as permissões da conta e do serviço.')
    if (response.status === 413) throw new AffiliateCatalogError(413, 'A consulta excedeu o limite do catálogo central.')
    if (response.status === 429) throw new AffiliateCatalogError(429, 'O catálogo central limitou as consultas. Aguarde antes de buscar novamente.')
    throw new AffiliateCatalogError(502, 'O catálogo central está indisponível. Nenhuma configuração da conta de origem foi alterada.')
  }
  return readCatalogJson(response)
}

const statusSchema = z.object({ configured: z.boolean(), connected: z.boolean(), clientId: z.string().regex(/^\d{1,32}$/).nullable(), status: z.enum(['CONNECTED', 'RECONNECT', 'CONFIGURED']), expiresAt: z.number().int().positive().optional() })
export async function affiliateCatalogGatewayStatus(settings: AffiliateCatalogGatewaySettings) {
  const parsed = statusSchema.safeParse(await request(settings, '/catalog/status'))
  if (!parsed.success) throw new AffiliateCatalogError(502, 'O catálogo central não retornou um estado válido da conexão.')
  const connected = parsed.data.configured && parsed.data.connected && parsed.data.status === 'CONNECTED' && (parsed.data.expiresAt === undefined || parsed.data.expiresAt > Date.now())
  return { ...parsed.data, connected, status: parsed.data.status === 'CONNECTED' && !connected ? 'RECONNECT' as const : parsed.data.status }
}

export async function affiliateCatalogGatewayRequest(settings: AffiliateCatalogGatewaySettings, path: string): Promise<unknown> {
  assertCatalogPath(path)
  return request(settings, '/catalog/request', { path })
}

// Optional batch protocol keeps older gateways compatible through bounded fallback.
export const affiliateCatalogGatewayRequests = (settings: AffiliateCatalogGatewaySettings): CatalogRequestMany => async paths => {
  if (!paths.length || paths.length > 10) throw new AffiliateCatalogError(400, 'Consulta de catálogo não permitida.')
  paths.forEach(assertCatalogPath)
  let raw: unknown
  try { raw = await request(settings, '/catalog/batch', { paths }) } catch (error) {
    if (!(error instanceof AffiliateCatalogError) || error.status !== 404) throw error
    const fallback: PromiseSettledResult<unknown>[] = []
    for (let index = 0; index < paths.length; index += 2) fallback.push(...await Promise.allSettled(paths.slice(index, index + 2).map(path => affiliateCatalogGatewayRequest(settings, path))))
    return fallback
  }
  const parsed = z.object({ results: z.array(z.object({ path: z.string(), status: z.number().int().min(200).max(599), body: z.unknown() })).max(10) }).safeParse(raw)
  if (!parsed.success || parsed.data.results.length !== paths.length || parsed.data.results.some((row, index) => row.path !== paths[index])) throw new AffiliateCatalogError(502, 'O catálogo central não retornou uma consulta válida.')
  return parsed.data.results.map(row => {
    if (row.status < 300) return { status: 'fulfilled' as const, value: row.body }
    if (row.status === 404 && /^\/products\/MLB\d+\/items\?/.test(row.path)) return { status: 'fulfilled' as const, value: { results: [], paging: { total: 0 } } }
    const status = row.status === 401 ? 409 : [403, 409, 413, 429].includes(row.status) ? row.status : 502
    return { status: 'rejected' as const, reason: new AffiliateCatalogError(status, status === 403 ? 'O Mercado Livre não liberou esta consulta.' : status === 429 ? 'O Mercado Livre limitou as consultas. Aguarde antes de buscar novamente.' : status === 409 ? 'A conexão do catálogo central precisa ser renovada pelo operador.' : 'Não foi possível conferir os vendedores deste produto.') }
  })
}
