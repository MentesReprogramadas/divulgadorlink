import { AdvertiseLanding } from '@/features/acquisition/components/advertise-landing'
import { loadAdvertiseCta } from '@/features/acquisition/server/load-advertise-cta'
import { campaignRegistrationHref } from '@/domain/campaign-touch'
import { headers } from 'next/headers'
import { requestHost } from '@/domain/crawler-policy'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const headerStore = await headers()
  const canonical = `https://${requestHost(headerStore.get('x-forwarded-host'), headerStore.get('host'))}/divulgar`
  return {
    title: 'Divulgue seu grupo, canal ou site grátis | Tem Link Aqui',
    description: 'Divulgue seu grupo, canal, site ou perfil em um catálogo por assunto e rede. Publicar é grátis. O envio passa pelas regras de análise antes de ir ao ar.',
    alternates: { canonical },
  }
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
