'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Loading } from '@/components/feedback/loading'
import { api } from '@/lib/api'

type Card = {
  id: string
  name: string
  surfaceToken: string
  embeddingState?: string
  relevanceScore?: number
  textScore?: number
  semanticScore?: number | null
}
type Suggest = { id: string; name: string; surfaceToken: string }

function SearchResults() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const [sponsored, setSponsored] = useState<Card[]>([])
  const [organic, setOrganic] = useState<Card[]>([])
  const [suggestions, setSuggestions] = useState<Suggest[]>([])
  const [suggestReady, setSuggestReady] = useState(false)
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading')

  async function load() {
    setState('loading')
    const result = await api<{ sponsored: Card[]; organic: Card[] }>(`/v1/search?q=${encodeURIComponent(q)}`)
    if (result.status >= 500 || result.status === 503) {
      setState('error')
      return
    }
    if (result.status !== 200) {
      setState('error')
      return
    }
    setSponsored(result.body.sponsored)
    setOrganic(result.body.organic)
    setState(result.body.sponsored.length + result.body.organic.length === 0 ? 'empty' : 'ready')
  }

  async function suggest(value: string) {
    setSuggestReady(false)
    if (value.trim().length === 0) {
      setSuggestions([])
      setSuggestReady(true)
      return
    }
    const result = await api<{ items: Suggest[] }>(`/v1/search/suggest?q=${encodeURIComponent(value)}`)
    setSuggestions(result.status === 200 ? result.body.items ?? [] : [])
    setSuggestReady(true)
  }

  useEffect(() => { void load() }, [q])

  return (
    <main>
      <form action="/busca">
        <label>Busca<input name="q" defaultValue={q} onChange={(event) => void suggest(event.target.value)} /></label>
      </form>
      {suggestReady ? (
        <ul aria-label="Sugestões">
          {suggestions.map((row) => <li key={row.id}><a href={`/link/${row.id}`}>{row.name}</a></li>)}
        </ul>
      ) : null}
      {suggestReady && suggestions.length === 0 ? <p>Nenhuma sugestão</p> : null}
      {state === 'loading' ? <Loading /> : null}
      {state === 'error' ? <ErrorState onRetry={() => void load()} /> : null}
      {state === 'empty' ? <EmptyState>Nenhum link encontrado</EmptyState> : null}
      {state === 'ready' ? (
        <>
          <section aria-label="Patrocinados">
            {sponsored.map((row) => <a key={row.id} href={`/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`}>{row.name}</a>)}
          </section>
          <section aria-label="Resultados">
            {organic.map((row) => <a key={row.id} href={`/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`}>{row.name}</a>)}
          </section>
        </>
      ) : null}
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<main><Loading /></main>}><SearchResults /></Suspense>
}
