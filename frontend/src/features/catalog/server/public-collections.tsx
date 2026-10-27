import { loadCatalog } from '@/lib/catalog-page'
import styles from '@/features/catalog/components/catalog-seo.module.css'

type PublicCollections = { collections: Array<{ slug: string; title: string; description: string; explicit: boolean; networkSlug?: string | null; nicheSlug?: string | null }> }

export async function PublicCollectionsSection({ networkSlug, nicheSlug, heading }: { networkSlug?: string; nicheSlug?: string; heading?: string } = {}) {
  let collections: PublicCollections['collections']
  try {
    const result = await loadCatalog('/api/v1/catalog-collections')
    if (result.status !== 200) throw new Error('Coleções indisponíveis')
    collections = (result.body as PublicCollections).collections
    if (!Array.isArray(collections)) throw new Error('Coleções ausentes na resposta')
  } catch {
    return <p role="status">Não foi possível carregar as coleções por assunto. Você pode continuar pelas redes e categorias.</p>
  }
  if (networkSlug) {
    const priority = ['adulto', 'apostas', 'compras-ofertas-cupons']
    const rank = (niche: string | null | undefined) => { const index = priority.indexOf(niche ?? ''); return index < 0 ? priority.length : index }
    collections = collections.filter(collection => collection.networkSlug === networkSlug)
      .sort((a, b) => rank(a.nicheSlug) - rank(b.nicheSlug))
  }
  if (nicheSlug) collections = collections.filter(collection => collection.nicheSlug === nicheSlug)
  if (!collections.length) return null
  const headingId = ['editorial-collections', networkSlug, nicheSlug].filter(Boolean).join('-')
  return <section className={styles.collections} aria-labelledby={headingId}>
    <h2 id={headingId}>{heading ?? (networkSlug === 'telegram' ? 'Grupos do Telegram por interesse' : 'Explore por interesse')}</h2>
    <p>Seleções de comunidades e links para o que você procura.</p>
    <ul>{collections.map(collection => <li key={collection.slug}><a href={`/descobrir/${encodeURIComponent(collection.slug)}`}>{collection.title}{collection.explicit && !/\+18|18\+/.test(collection.title) ? ' · +18' : ''}</a><p>{collection.description}</p></li>)}</ul>
  </section>
}
