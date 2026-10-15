import { AdvertiseLanding } from '@/features/acquisition/components/advertise-landing'
import { loadAdvertiseCta } from '@/features/acquisition/server/load-advertise-cta'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Publique o seu link | Tem Link Aqui',
  description: 'O Tem Link Aqui coloca o seu site, grupo ou perfil num catálogo por tema e rede. Publicar é grátis. Uma pessoa analisa o envio antes de ele ir ao ar.',
}

export default async function AdvertisePage() {
  const cta = await loadAdvertiseCta()
  return <AdvertiseLanding cta={cta} />
}
