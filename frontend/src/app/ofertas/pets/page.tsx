import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { requestHost } from '@/domain/crawler-policy'
import { PetsLanding } from '@/features/affiliates/components/pets-landing'

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers()
  const origin = `https://${requestHost(headerStore.get('x-forwarded-host'), headerStore.get('host'))}`
  const canonical = `${origin}/ofertas/pets`
  const title = 'Achadinhos Pet no WhatsApp | Tem Link Aqui'
  const description = 'Ofertas e cupons para cuidar do seu pet. Conheça o grupo gratuito de Achadinhos Pet do Tem Link Aqui no WhatsApp.'
  const image = { url: `${origin}/ofertas/pets/avatar.webp`, width: 512, height: 512, alt: 'Achadinhos Pet do Tem Link Aqui, com cachorro e gato' }
  return { title, description, alternates: { canonical }, robots: { index: true, follow: true },
    openGraph: { type: 'website', title, description, url: canonical, siteName: 'Tem Link Aqui', locale: 'pt_BR', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] } }
}

export default function PetsPage() {
  return <PetsLanding />
}
