import { cookies, headers } from 'next/headers'
import { advertiseCta } from '@/domain/advertise'
import { forward, tenantHost } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Publique o seu link | Tem Link Aqui',
  description: 'O Tem Link Aqui coloca o seu site, grupo ou perfil num catálogo por tema e rede. Publicar é grátis. Uma pessoa analisa o envio antes de ele ir ao ar.',
}

async function loadCta(): Promise<{ href: string; label: string }> {
  const jar = await cookies()
  if (!jar.get('catalogo_role')) return advertiseCta(null)
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  try {
    const result = await forward({
      method: 'GET',
      path: '/api/v1/auth/session',
      host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
      cookie: jar.toString(),
    })
    if (result.status !== 200) return advertiseCta(null)
    const body = JSON.parse(result.body.toString()) as { canSubmit?: boolean }
    return advertiseCta({ canSubmit: body.canSubmit === true })
  } catch {
    return advertiseCta(null)
  }
}

export default async function AdvertisePage() {
  const cta = await loadCta()
  return (
    <main className="auth-page">
      <h1 className="entry-title">Publique o seu link.</h1>
      <p>
        O Tem Link Aqui coloca o seu site, grupo ou perfil num catálogo por tema e rede. Publicar é grátis. Uma pessoa analisa o envio antes de ele ir ao ar. O destaque é pago e só existe depois que o link foi publicado.
      </p>
      <ul>
        <li>Uma URL https pública.</li>
        <li>Um tema.</li>
        <li>Uma rede.</li>
        <li>Sem promessa de audiência.</li>
      </ul>
      <a className="button button-primary" href={cta.href}>{cta.label}</a>
    </main>
  )
}
