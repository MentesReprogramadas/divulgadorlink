export function DetailContext({ href, name, home = false }: { href: string; name: string; home?: boolean }) {
  return (
    <a className="detail-back" href={href} aria-label={home ? 'Voltar para início' : `Voltar para ${name}`}>
      <span aria-hidden="true">←</span>
      {name}
    </a>
  )
}
