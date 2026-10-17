import { assertPublicHttps } from '@/adapters/http/safe-fetch'
import { canonicalUrl } from '@/domain/links/canonical-url'
import type { UrlProbe } from '@/use-cases/@Links/link-availability'

export class RedirectError extends Error {
  constructor(readonly status: number, message: string, readonly resource?: { id: string; version: number }) { super(message) }
}

/** Validates transport only. Content approval remains a separate mandatory gate. */
export async function validateRedirectDestination(raw: string, probe: UrlProbe): Promise<string> {
  let destination: string
  try { assertPublicHttps(raw); destination = canonicalUrl(raw) }
  catch { throw new RedirectError(422, 'Use um endereço HTTPS público, sem credenciais ou portas especiais.') }
  let status: number | null
  try { status = await probe(destination) }
  catch { throw new RedirectError(503, 'Não foi possível validar o destino. Tente novamente.') }
  if (status === null) throw new RedirectError(503, 'Não foi possível validar o destino. Tente novamente.')
  if (status < 200 || status >= 300) throw new RedirectError(422, 'O destino está indisponível ou não é permitido. Confira o convite.')
  return destination
}
