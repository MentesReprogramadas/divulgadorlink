export function Pagination({
  page,
  pages,
  onPage,
  variant = 'full',
}: {
  page: number
  pages: number
  onPage: (page: number) => void
  variant?: 'full' | 'compact'
}) {
  if (pages <= 1) return null
  const items = variant === 'full' ? Array.from({ length: pages }, (_, index) => index + 1) : []
  return (
    <nav className={variant==='compact'?`pager ${styles.compact}`:'pager'} aria-label="Paginação">
      <Button readOnlyAllowed variant="secondary" className={styles.action} type="button" aria-label="Anterior" disabled={page <= 1} onClick={() => onPage(page - 1)}><ActionIcon name="back" /><span className={variant==='compact'?styles.compactLabel:undefined}>Anterior</span></Button>
      {variant === 'compact' ? <span aria-live="polite">Página {page} de {pages}</span> : null}
      {items.map((item) => (
        <Button readOnlyAllowed variant="secondary"
          key={item}
          type="button"
          aria-current={item === page ? 'page' : undefined}
          onClick={() => onPage(item)}
        >
          {item}
        </Button>
      ))}
      <Button readOnlyAllowed variant="secondary" className={styles.action} type="button" aria-label="Próxima" disabled={page >= pages} onClick={() => onPage(page + 1)}><ActionIcon name="next" /><span className={variant==='compact'?styles.compactLabel:undefined}>Próxima</span></Button>
    </nav>
  )
}
import { ActionIcon } from './action-icon'
import styles from './pagination.module.css'
import { Button } from './button'
