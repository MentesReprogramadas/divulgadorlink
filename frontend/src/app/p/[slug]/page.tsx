import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { tenantHost } from '@/lib/upstream'
import { loadPublicProfile } from '@/features/profiles/server/load-profile'
import { ProfileView } from '@/features/profiles/components/profile-view'
import { ProfileAgeGate } from '@/features/profiles/profile-age-gate'
import styles from '@/features/profiles/components/profiles.module.css'
export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params, content = await loadPublicProfile(slug)
  if (!content) notFound()
  return { title: content.restricted ? 'Conteúdo para maiores de 18 anos' : content.name + ' | Tem Link Aqui', description: content.restricted ? undefined : content.bio, robots: { index: false, follow: !content.restricted }, alternates: { canonical: 'https://' + tenantHost((await headers()).get('host') ?? 'localhost') + '/p/' + encodeURIComponent(slug) } }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, content = await loadPublicProfile(slug)
  if (!content) notFound()
  return <main className={styles.publicPage}>{content.restricted ? <ProfileAgeGate /> : <ProfileView content={content} avatarUrl={content.avatarAssetId ? '/bff/v1/profiles/' + encodeURIComponent(slug) + '/avatar/' + content.avatarAssetId : undefined} />}</main>
}
