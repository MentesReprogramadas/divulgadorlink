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

function FacetSummaryRow({
  kind,
  row,
  onSaved,
}: {
  kind: FacetKind
  row: FacetRow
  onSaved: (next: FacetRow) => void
}) {
  const [value, setValue] = useState(row.summary ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
        setValue(result.body.summary ?? '')
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
    <div>
      <p className="setting-title">{row.name}</p>
      <p className="setting-copy">{row.slug}</p>
      <p>{searchLabel(row)}</p>
      <textarea
        className="field"
        aria-label={`Resumo de ${row.name}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="button" className="button button-primary" disabled={saving} onClick={() => void save()}>
        {`Salvar ${row.name}`}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  )
}

function FacetList({
  title,
  kind,
  rows,
  onSaved,
}: {
  title: string
  kind: FacetKind
  rows: FacetRow[]
  onSaved: (next: FacetRow) => void
}) {
  return (
    <section>
      <h3 className="setting-title">{title}</h3>
      {rows.map((row) => (
        <FacetSummaryRow key={row.id} kind={kind} row={row} onSaved={onSaved} />
      ))}
    </section>
  )
}

export function FacetSummaries() {
  const [lists, setLists] = useState<FacetLists | null>(null)
  const [loadError, setLoadError] = useState('')

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

  function replace(kind: FacetKind, next: FacetRow) {
    setLists((current) => {
      if (!current) return current
      const key = kind === 'niche' ? 'niches' : 'networks'
      return {
        ...current,
        [key]: current[key].map((row) => (row.id === next.id ? next : row)),
      }
    })
  }

  return (
    <section>
      <h2 className="panel-section-title">Textos do catálogo</h2>
      {loadError ? <p>{loadError}</p> : null}
      {lists ? (
        <>
          <FacetList title="Nichos" kind="niche" rows={lists.niches} onSaved={(row) => replace('niche', row)} />
          <FacetList title="Redes" kind="network" rows={lists.networks} onSaved={(row) => replace('network', row)} />
        </>
      ) : null}
    </section>
  )
}
