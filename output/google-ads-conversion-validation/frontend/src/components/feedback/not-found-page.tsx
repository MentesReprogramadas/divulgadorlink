import { ButtonLink } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="auth-page">
      <h1 className="entry-title">Não encontrado</h1>
      <p className="auth-lead">Esta página não está disponível. Você pode voltar ao catálogo ou buscar outro conteúdo.</p>
      <div className="editor-actions"><ButtonLink href="/">Voltar ao catálogo</ButtonLink><ButtonLink href="/busca" variant="secondary">Buscar links</ButtonLink></div>
    </main>
  )
}
