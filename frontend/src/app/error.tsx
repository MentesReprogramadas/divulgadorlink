'use client'

import { ErrorState } from '@/components/feedback/error-state'

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="search-page"><h1 className="entry-title">Não foi possível abrir esta página</h1><ErrorState readOnlyAllowed message="Ocorreu uma falha ao carregar o conteúdo. Tente novamente." onRetry={reset} /><a href="/">Voltar ao catálogo</a></main>
}
