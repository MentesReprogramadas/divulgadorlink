import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="entry-title">{title}</h1>
        {description ? <p className="page-header-note">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  )
}

export function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <header className="section-header">
      <h2>{title}</h2>
      {note ? <p>{note}</p> : null}
    </header>
  )
}
