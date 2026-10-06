export function Breadcrumb({ items }: { items: Array<{ href: string; name: string }> }) {
  return (
    <nav className="detail-back" aria-label="Trilha">
      {items.map((item, index) => (
        <span key={item.href}>
          {index > 0 ? <span aria-hidden="true"> / </span> : null}
          {index === items.length - 1 ? <span>{item.name}</span> : <a href={item.href}>{item.name}</a>}
        </span>
      ))}
    </nav>
  )
}
