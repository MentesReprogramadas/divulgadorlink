import { Button } from '@/components/ui/button'
import styles from '@/features/catalog/components/catalog-seo.module.css'

export function HomeMore({ cursor, loading = false, onLoad, href }: { cursor: string | null; loading?: boolean; onLoad: () => void; href?: string }) {
  if (!cursor) return null
  return <div className={styles.pagination}><Button type="button" variant="secondary" loading={loading} onClick={onLoad} aria-label={loading ? 'Carregando links…' : undefined} aria-controls="home-catalog-results">Mostrar mais</Button>{href ? <a href={href} rel="next">Abrir próxima página</a> : null}</div>
}
