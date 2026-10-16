import type { ReactNode } from 'react'
import { LinkRow } from '@/components/domain/link-row'
import type { SavedFavorite } from '../favorites-contract'
import styles from './favorites.module.css'

export function FavoriteList({ items, actions }: { items: SavedFavorite[]; actions: (item: SavedFavorite, index: number) => ReactNode }) {
  if (!items.length) return <p className={styles.note}>Nenhum favorito nesta lista.</p>
  return <ul className={styles.list}>{items.map((item, index) => <li key={item.id} className={styles.item}>
    {item.available ? <LinkRow id={item.linkId} name={item.name} description={item.description} niche={item.niche} network={item.network} href={item.href} placement="organic" showImpressions={false} /> : <div className={styles.unavailable}><h3>Link indisponível</h3><p className={styles.note}>O conteúdo está oculto ou exige confirmação de idade. Você pode manter ou remover este favorito.</p></div>}
    <div className={styles.actions}>{actions(item, index)}</div>
  </li>)}</ul>
}
