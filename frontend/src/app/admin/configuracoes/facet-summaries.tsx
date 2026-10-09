'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type FacetKind = 'niche' | 'network'

type FacetRow = {
  id: string
  name: string
  slug: string
  requiresAge: boolean
  isPublicFacet: boolean
  summary: string | null
  substantiveCount: number
  indexable: boolean
}

type FacetLists = {
  niches: FacetRow[]
  networks: FacetRow[]
}

function searchLabel(row: FacetRow): string {
  if (row.requiresAge) return '18+, fora da busca'
  return row.indexable ? 'Na busca' : 'Fora da busca'
}

function lengthHint(row: FacetRow, count: number): string {
  const size = `${count} caracteres`
  if (row.requiresAge) return `${size}. Conteúdo 18+ continua fora da busca.`
  if (!row.isPublicFacet) return `${size}. Este catálogo fica fora da busca.`
  if (count < 80) return `${size}. Abaixo de 80, a página só entra na busca com links suficientes.`
  return `${size}.`
}

function FacetEditor({
  kind,
  row,
  value,
  onChange,
  onSaved,
}: {
  kind: FacetKind
  row: FacetRow
  value: string
  onChange: (value: string) => void
  onSaved: (next: FacetRow) => void
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const count = value.trim().length

  async function save() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const result = await api<FacetRow & { message?: string }>(`/v1/admin/facets/${kind}/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ summary: value.trim() ? value : null }),
      })
      if (result.status === 200) {
        onChange(result.body.summary ?? '')
        onSaved(result.body)
        return
      }
      setError(result.body.message ?? 'Não foi possível salvar.')
    } catch {
      setError('Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="catalog-copy-editor">
      <h3 className="setting-title">{row.name}</h3>
      <p className="setting-copy">{row.slug}</p>
      <textarea
        className="field"
        rows={5}
        aria-label={`Resumo de ${row.name}`}
        aria-describedby={`resumo-${row.id}-tamanho`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`resumo-${row.id}-tamanho`} className="setting-copy">{lengthHint(row, count)}</p>
      <button type="button" className="button button-primary" disabled={saving} onClick={() => void save()}>
        {`Salvar ${row.name}`}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  )
}

export function FacetSummaries() {
  const [lists, setLists] = useState<FacetLists | null>(null)
  const [loadError, setLoadError] = useState('')
  const [kind, setKind] = useState<FacetKind>('niche')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    void api<FacetLists>('/v1/admin/facets')
      .then((result) => {
        if (result.status === 200) setLists(result.body)
        else setLoadError('Não foi possível carregar os textos.')
      })
      .catch(() => {
        setLoadError('Não foi possível carregar os textos.')
      })
  }, [])

  function replace(nextKind: FacetKind, next: FacetRow) {
    setLists((current) => {
      if (!current) return current
      const key = nextKind === 'niche' ? 'niches' : 'networks'
      return {
        ...current,
        [key]: current[key].map((row) => (row.id === next.id ? next : row)),
      }
    })
  }

  const rows = lists ? (kind === 'niche' ? lists.niches : lists.networks) : []
  const needle = query.trim().toLocaleLowerCase('pt-BR')
  const visible = needle
    ? rows.filter((row) => `${row.name} ${row.slug}`.toLocaleLowerCase('pt-BR').includes(needle))
    : rows
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null
  const draft = selected ? drafts[selected.id] ?? selected.summary ?? '' : ''

  return (
    <section className="catalog-copy">
      <h2 className="panel-section-title">Textos do catálogo</h2>
      <p className="catalog-copy-lead">Esse texto é a descrição que o Google mostra na página do nicho ou da rede.</p>
      {loadError ? <p>{loadError}</p> : null}
      {lists ? (
        <>
          <div className="filter-row" role="tablist" aria-label="Tipo de catálogo">
            <button type="button" role="tab" aria-selected={kind === 'niche'} onClick={() => setKind('niche')}>Nichos</button>
            <button type="button" role="tab" aria-selected={kind === 'network'} onClick={() => setKind('network')}>Redes</button>
          </div>
          <div className="catalog-copy-board">
            <div>
              <input
                className="field"
                aria-label="Filtrar catálogos"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="catalog-copy-list">
                {visible.length === 0 ? <p className="catalog-copy-empty">Nenhum catálogo com esse nome.</p> : null}
                {visible.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="catalog-copy-item"
                    aria-current={selected?.id === row.id ? 'true' : undefined}
                    aria-label={row.name}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span>{row.name}</span>
                    <span className="catalog-copy-status">{searchLabel(row)}</span>
                  </button>
                ))}
              </div>
            </div>
            {selected ? (
              <FacetEditor
                key={selected.id}
                kind={kind}
                row={selected}
                value={draft}
                onChange={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))}
                onSaved={(next) => replace(kind, next)}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
