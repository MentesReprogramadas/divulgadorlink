'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { FacetFilters } from '@/components/domain/facet-filters'
import { LinkRow } from '@/components/domain/link-row'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Loading } from '@/components/feedback/loading'
import { TitleMark } from '@/components/ui/facet-badge'
import { api } from '@/lib/api'

type Facet = { name?: string; slug?: string } | null
type Card = { id: string; name: string; description: string; surfaceToken: string; impressions?: number; niche?: Facet; network?: Facet }
type NicheSeo = { title: string; description?: string }
type NicheBody = {
  seo: NicheSeo
  ageRequired?: boolean
  blocked?: boolean
  networks?: Array<{ id: string; name: string; slug: string }>
  showImpressions?: boolean
  sponsored: Card[]
  organic: Card[]
  nextCursor?: string | null
}

function rowHref(row: Card): string {
  return `/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`
}

function usableDescription(seo: NicheSeo): string | null {
  const description = seo.description?.trim() ?? ''
  if (!description || description === seo.title.trim()) return null
  return description
}

function BackHome() {
  return (
    <a className="niche-back" href="/" aria-label="Voltar para início">
      <span aria-hidden="true">←</span>
      Início
    </a>
  )
}

function ResultList({
  id,
  title,
  rows,
  placement,
  showImpressions,
}: {
  id: string
  title: string
  rows: Card[]
  placement: 'sponsored' | 'organic'
  showImpressions: boolean
}) {
  return (
    <section className="niche-list" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="niche-results">
        {rows.map((row) => (
          <LinkRow
            key={row.id}
            id={row.id}
            name={row.name}
            description={row.description}
            href={rowHref(row)}
            placement={placement}
            niche={row.niche}
            network={row.network}
            impressions={row.impressions}
            showImpressions={showImpressions}
          />
        ))}
      </div>
    </section>
  )
}

function NichePage() {
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  const network = search.get('rede')
  const [body, setBody] = useState<NicheBody | null>(null)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')

  async function load() {
    setState('loading')
    const filter = network ? `?network=${encodeURIComponent(network)}` : ''
    const result = await api<NicheBody>(`/v1/niches/${encodeURIComponent(params.slug)}${filter}`)
    if (result.status !== 200 || !result.body.seo?.title) {
      setBody(null)
      setState('error')
      return
    }
    setBody(result.body)
    setState('ready')
  }

  useEffect(() => { void load() }, [params.slug, network])

  async function answer(choice: 'yes' | 'no') {
    if (choice === 'no') {
      window.location.href = '/'
      return
    }
    if (await confirmAge(choice)) await load()
  }

  if (state === 'loading') return <main className="niche-page"><BackHome /><Loading /></main>
  if (state === 'error' || !body) return <main className="niche-page"><BackHome /><ErrorState onRetry={() => void load()} /></main>

  const showImpressions = body.showImpressions !== false
  const sponsored = body.sponsored ?? []
  const organic = body.organic ?? []
  const description = usableDescription(body.seo)

  return (
    <main className="niche-page">
      <BackHome />
      <h1 className="entry-title page-mark"><TitleMark kind="niche" slug={params.slug} />{body.seo.title}</h1>
      {description ? <p className="niche-description">{description}</p> : null}
      <FacetFilters
        label="Redes"
        kind="network"
        items={body.networks ?? []}
        active={network}
        hrefFor={(slug) => slug ? `/nicho/${params.slug}?rede=${encodeURIComponent(slug)}` : `/nicho/${params.slug}`}
      />
      {body.ageRequired ? <AgePrompt onYes={() => void answer('yes')} onNo={() => void answer('no')} /> : null}
      {body.blocked ? <p className="age-blocked">Este conteúdo é só para maiores de 18 anos.</p> : null}
      {sponsored.length > 0 ? (
        <ResultList id="niche-patrocinados" title="Patrocinados" rows={sponsored} placement="sponsored" showImpressions={showImpressions} />
      ) : null}
      {organic.length > 0 ? (
        <ResultList id="niche-organicos" title="Orgânicos" rows={organic} placement="organic" showImpressions={showImpressions} />
      ) : null}
      {!body.ageRequired && !body.blocked && sponsored.length === 0 && organic.length === 0 ? <EmptyState>Nenhum link publicado</EmptyState> : null}
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<main className="niche-page"><Loading /></main>}><NichePage /></Suspense>
}
