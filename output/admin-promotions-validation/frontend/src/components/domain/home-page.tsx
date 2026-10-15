export function HomePage({
  links,
}: {
  links: Array<{ id: string; name: string; description?: string; requiresAge?: boolean }>
}) {
  const visible = links.filter((link) => link.requiresAge !== true)
  return (
    <main>
      {visible.map((link) => (
        <article key={link.id} className="card">
          <a href={`/link/${link.id}`}>{link.name}</a>
          {link.description ? <p>{link.description}</p> : null}
        </article>
      ))}
    </main>
  )
}
