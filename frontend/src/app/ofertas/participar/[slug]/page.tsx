import { notFound } from 'next/navigation'
import { AffiliateEntryForm } from '@/features/affiliates/affiliate-entry-form'
import { inviteMetadata } from '@/features/affiliates/server/invite-metadata'
import { loadCatalog } from '@/lib/catalog-page'
import styles from '@/features/affiliates/affiliate-entry.module.css'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const metadata = await inviteMetadata(slug)
  const original = metadata.alternates?.canonical
  const canonical = typeof original === 'string' ? original.replace('/ofertas/entrar/', '/ofertas/participar/') : undefined
  return { ...metadata, alternates: { canonical }, openGraph: { ...metadata.openGraph, ...(canonical ? { url: canonical } : {}) } }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound()
  const result = await loadCatalog('/api/v1/public/affiliates/' + encodeURIComponent(slug))
  const segment = result.body as { name?: string; imageUrl?: string | null; available?: boolean } | null
  if (result.status !== 200 || !segment?.name) notFound()
  return <main className={styles.page}>{segment.imageUrl ? <img className={styles.avatar} src={segment.imageUrl} width={144} height={144} alt="" /> : null}<h1>{segment.name}</h1>{segment.available ? <AffiliateEntryForm slug={slug} /> : <p>Este grupo está indisponível no momento. Tente novamente mais tarde.</p>}</main>
}
