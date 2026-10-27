import {headers} from 'next/headers'
import { loadPublicLink } from '@/features/catalog/server/load-link'
import {personalHostTarget,personalHostOrigin} from '@/features/profile-hosts/host-routing'
import type { Metadata } from 'next'
import { Suspense, type CSSProperties } from 'react'
import { cookies } from 'next/headers'
import { Source_Sans_3, Outfit } from 'next/font/google'
import { SiteShell } from '@/components/layout/site-shell'
import { RoutePending } from '@/components/layout/route-pending'
import { loadPublicProfile } from '@/features/profiles/server/load-profile'
import { profileAppearance, readableInk } from '@/features/profiles/profile-appearance'
import { loadPreviewAppearance } from '@/features/profiles/server/load-preview-appearance'
import { notFound } from 'next/navigation'
import { loadCatalog } from '@/lib/catalog-page'
import { catalogQueryRecord } from '@/domain/catalog-navigation'
import { Consent } from '@/components/domain/consent'
import { SiteVisits } from '@/components/domain/site-visits'
import './globals.css'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
})

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'Tem Link Aqui',
  description: 'Links, comunidades e serviços organizados por tema e rede.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders=await headers(),hostHeader=requestHeaders.get('host')??'',personal=personalHostTarget(hostHeader),personalHost=Boolean(personal)
  const linkId = /^\/link\/([^/]+)\/?$/.exec(requestHeaders.get('x-pathname') ?? '')?.[1]
  const collectionSlug = /^\/descobrir\/([^/]+)\/?$/.exec(requestHeaders.get('x-pathname') ?? '')?.[1]
  if (collectionSlug) {
    if (!/^[a-z0-9-]{1,80}$/.test(collectionSlug)) notFound()
    const search = new URLSearchParams(requestHeaders.get('x-search') ?? '')
    const values = Object.fromEntries(Array.from(new Set(search.keys()), key => {
      const all = search.getAll(key)
      return [key, all.length === 1 ? all[0] : all]
    }))
    const query = catalogQueryRecord(values)
    const result = await loadCatalog(`/api/v1/catalog-collections/${collectionSlug}${query.size ? `?${query}` : ''}`)
    if (result.status === 404) notFound()
  }
  // Resolve the link before the shell streams so metadata can set its HTTP status.
  if (linkId) await loadPublicLink(linkId)
  const personalOrigin=personal?personalHostOrigin(personal.tenantHost,hostHeader.split(':')[1]??''):undefined
  const jar = await cookies()
  const role = jar.get('catalogo_role')?.value
  const support = jar.has('supportSession')
  const stored = jar.get('tla_consent')?.value
  const pending = stored !== 'marketing' && stored !== 'denied'
  const publicSlug = requestHeaders.get('x-profile-slug') ?? /^\/p\/([a-z0-9-]{3,40})\/?$/.exec(requestHeaders.get('x-pathname') ?? '')?.[1]
  let publicBackground: string | undefined
  if (publicSlug) {
    // Resolve the published palette before the first HTML paint, using the same age/tenant-aware cache as metadata.
    const profile = await loadPublicProfile(publicSlug, undefined).catch(() => null)
    if (profile && !profile.restricted) publicBackground = profileAppearance(profile.appearance).background
  }
  const previewPath=requestHeaders.get('x-pathname')??''
  const sharedPreview=/^\/painel\/equipe\/([^/]+)\/previa$/.exec(previewPath)
  const profilePreview=previewPath==='/painel/perfil/previa'||Boolean(sharedPreview)
  if(profilePreview){
    const appearance=await loadPreviewAppearance(sharedPreview?.[1])
    publicBackground=profileAppearance(appearance).background
  }
  return (
    <html lang="pt-BR" className={`${sourceSans.variable} ${outfit.variable}`}>
      <body style={publicBackground ? { backgroundColor: publicBackground, ...(profilePreview ? {'--profile-preview-background':publicBackground,'--profile-preview-ink':readableInk(publicBackground)} : {}) } as CSSProperties : undefined} data-personal-origin={personalOrigin} data-personal-host={personalHost?'true':undefined} data-support={!personalHost&&support?'true':undefined}>
        {/* Keep async children off the host replay path until Next bundles https://github.com/react/react/pull/35494. */}
        <SiteShell personalHost={personalHost} role={personalHost?undefined:role} support={!personalHost&&support}>{linkId ? children : <Suspense fallback={<RoutePending variant="page" />}>{children}</Suspense>}</SiteShell>
        <Consent pending={pending} />
        {personalHost?null:<SiteVisits />}
      </body>
    </html>
  )
}
