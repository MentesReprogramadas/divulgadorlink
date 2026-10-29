import { affiliateRequest } from './contracts'

export type AffiliateConnectionQr = { state?: string; base64?: string; pairingCode?: string }

export async function requestConnectionQr(instanceId: string, signal: AbortSignal): Promise<AffiliateConnectionQr> {
  let result: AffiliateConnectionQr = {}
  for (let attempt = 0; attempt < 5; attempt++) {
    if (signal.aborted) throw new DOMException('Conexão cancelada.', 'AbortError')
    result = await affiliateRequest<AffiliateConnectionQr>('/instances/' + instanceId + '/connect', 'POST', {}, signal)
    if (signal.aborted) throw new DOMException('Conexão cancelada.', 'AbortError')
    if (result.base64 || result.pairingCode || result.state === 'open' || attempt === 4) return result
    await new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve() }
      const timer = setTimeout(finish, 1500)
      signal.addEventListener('abort', finish, { once: true })
    })
  }
  return result
}
