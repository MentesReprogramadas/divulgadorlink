import type { ReactNode } from 'react'
import type { LegalDocument } from '@/domain/legal'

export function LegalArticle({
  title,
  document,
  other,
  extra,
}: {
  title: string
  document: LegalDocument
  other: { href: string; label: string }
  extra?: ReactNode
}) {
  return (
    <main className="legal-page">
      <h1 className="entry-title">{title}</h1>
      <p className="auth-lead">{document.updated}</p>
      {document.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      {extra}
      <p className="auth-switch"><a href={other.href}>{other.label}</a></p>
    </main>
  )
}
