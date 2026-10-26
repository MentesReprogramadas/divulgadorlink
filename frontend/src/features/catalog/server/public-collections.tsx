import { loadCatalog } from '@/lib/catalog-page'
import styles from '@/features/catalog/components/catalog-seo.module.css'

type PublicCollections = { collections: Array<{ slug: string; title: string; description: string; explicit: boolean }> }

export async function PublicCollectionsSection() {
  let collections: PublicCollections['collections']
  try {
    const result = await loadCatalog('/api/v1/catalog-collections')
    if (result.status !== 200) throw new Error('Coleções indisponíveis')
    collections = (result.body as PublicCollections).collections
    if (!Array.isArray(collections)) throw new Error('Coleções ausentes na resposta')
  } catch {
    return <p role="status">Não foi possível carregar as coleções por assunto. Você pode continuar pelas redes e categorias.</p>
  }
  if (!collections.length) return null
  return <section className={styles.collections} aria-labelledby="editorial-collections">
    <h2 id="editorial-collections">Explore por interesse</h2>
    <p>Seleções de comunidades e links para o que você procura.</p>
    <ul>{collections.map(collection => <li key={collection.slug}><a href={`/descobrir/${encodeURIComponent(collection.slug)}`}>{collection.title}{collection.explicit ? ' · +18' : ''}</a><p>{collection.description}</p></li>)}</ul>
  </section>
}
