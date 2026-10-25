import { AdvertiseLanding } from '@/features/acquisition/components/advertise-landing'
import { loadAdvertiseCta } from '@/features/acquisition/server/load-advertise-cta'
import { campaignRegistrationHref } from '@/domain/campaign-touch'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Publique o seu link | Tem Link Aqui',
  description: 'O Tem Link Aqui coloca o seu site, grupo ou perfil num catálogo por tema e rede. Publicar é grátis. Uma pessoa analisa o envio antes de ele ir ao ar.',
}

export default async function AdvertisePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cta = await loadAdvertiseCta()
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value)
    else if (value?.[0]) params.set(key, value[0])
  }
  cta.href = campaignRegistrationHref(cta.href, params)
  return <AdvertiseLanding cta={cta} />
}
