export function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
}) {
  if (pages <= 1) return null
  const items = Array.from({ length: pages }, (_, index) => index + 1)
  return (
    <nav className="pager" aria-label="Paginação">
      <button className={styles.action} type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><ActionIcon name="back" />Anterior</button>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          aria-current={item === page ? 'page' : undefined}
          onClick={() => onPage(item)}
        >
          {item}
        </button>
      ))}
      <button className={styles.action} type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}><ActionIcon name="next" />Próxima</button>
    </nav>
  )
}
import { ActionIcon } from './action-icon'
import styles from './pagination.module.css'
