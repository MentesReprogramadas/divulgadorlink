import Link from 'next/link'
import { CatalogImage } from '@/components/domain/catalog-image'
import { ActionIcon } from '@/components/ui/action-icon'
import { FacetIcon } from '@/components/ui/facet-badge'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from './ondas-catalog.module.css'

export type HomeCollectionLink = { id: string; name: string; imageUrl?: string | null; imageAlt?: string | null; niche?: { name?: string; slug?: string } | null }
export type HomeCollectionsProps = { links: HomeCollectionLink[]; discoveryQuery?: string }

export function HomeCollections({ links, discoveryQuery = '' }: HomeCollectionsProps) {
  const collections: Array<{ link: HomeCollectionLink; slug: string; niche: string }> = []
  const seen = new Set<string>()
  for (const link of links) {
    const slug = link.niche?.slug?.trim(), niche = link.niche?.name?.trim()
    if (!link.imageUrl?.trim() || !slug || !niche || seen.has(slug)) continue
    seen.add(slug)
    collections.push({ link, slug, niche })
    if (collections.length === 3) break
  }
  const query = discoveryQuery ? `?${discoveryQuery}` : ''
  return <>
    {collections.length ? <section className={styles.collections} aria-labelledby="home-collections"><div className={styles.sectionHeading}><div><h2 id="home-collections">Deixe a curiosidade levar.</h2><p>Escolha um assunto. Veja onde ele pode te levar.</p></div></div><div className={styles.collectionGrid}>{collections.map(({ link, slug, niche }) => <Link className={styles.collection} key={slug} href={`/nicho/${encodeURIComponent(slug)}${query}`}><span className={styles.collectionPhoto} data-collection-photo><CatalogImage src={link.imageUrl} alt={link.imageAlt} className="" sizes="(max-width: 600px) calc(100vw - 48px), (max-width: 850px) calc((100vw - 116px) / 3), (max-width: 1100px) calc((100vw - 140px) / 3), (max-width: 1352px) calc((100vw - 154px) / 3), 400px" /></span><span className={styles.collectionCopy}><LiquidLens radius={16} /><span><small><FacetIcon kind="niche" slug={slug} size={16} />{niche}</small><strong>{link.name}</strong></span><ActionIcon name="next" width="22" height="22" /></span></Link>)}</div></section> : null}
    <aside className={styles.publish}><LiquidLens radius={24} /><div className={styles.publishWaves} aria-hidden="true"><i /><i /><i /></div><div><h2>A sua comunidade<br />também tem lugar aqui.</h2><p>Compartilhe seu grupo, canal ou conteúdo.<br />Publicar é grátis. Destaques são espaços pagos.</p></div><Link href="/divulgar" className={styles.primary}><LiquidLens radius={12} />Quero divulgar meu link<ActionIcon name="next" width="19" height="19" /></Link></aside>
  </>
}
