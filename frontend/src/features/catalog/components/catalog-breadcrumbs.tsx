import styles from './catalog-seo.module.css'

export type CatalogBreadcrumb = { name: string; path: string }

export function CatalogBreadcrumbs({ items }: { items: CatalogBreadcrumb[] }) {
  return <nav className={styles.trail} aria-label="Trilha">
    {items.map((item, index) => <span key={item.path}>
      {index ? <span aria-hidden="true"> / </span> : null}
      {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <a href={item.path}>{item.name}</a>}
    </span>)}
  </nav>
}
