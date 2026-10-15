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
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
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
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima</button>
    </nav>
  )
}
