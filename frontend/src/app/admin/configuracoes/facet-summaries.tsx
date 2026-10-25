'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { ActionIcon } from '@/components/ui/action-icon'
import { WorkspaceFilters } from '@/components/layout/workspace-controls'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { FacetSummariesSkeleton } from '@/features/administration/components/settings-skeleton'
import { EmptyState } from '@/components/feedback/empty-state'
import styles from '@/features/administration/components/facet-summaries.module.css'

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
      <label className="field-label" htmlFor={'resumo-' + row.id}>Resumo de {row.name}</label>
      <TextArea
        id={'resumo-' + row.id}
        rows={5}
        aria-label={`Resumo de ${row.name}`}
        aria-describedby={`resumo-${row.id}-tamanho`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`resumo-${row.id}-tamanho`} className="setting-copy">{lengthHint(row, count)}</p>
      <Button type="button" disabled={saving} onClick={() => void save()}>
        <ActionIcon name="save" />{`Salvar ${row.name}`}
      </Button>
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
  const [editing, setEditing] = useState(false)
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
    <section className={styles.board} aria-label="Textos do catálogo">
      {!lists && !loadError ? <FacetSummariesSkeleton /> : null}
      {loadError ? <p>{loadError}</p> : null}
      {lists ? (
        <>
          <div className={styles.board}>
            <div>
              <WorkspaceFilters label="Filtrar textos do catálogo">
              <Field label="Tipo de catálogo"><Select value={kind} onChange={event => setKind(event.target.value as FacetKind)}><option value="niche">Categorias</option><option value="network">Redes</option></Select></Field>
              <Field label="Filtrar catálogos"><Input
                placeholder="Nome da categoria ou rede"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              /></Field>
              </WorkspaceFilters>
              <div className={styles.list}>
                {visible.length === 0 ? <EmptyState /> : null}
                {visible.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={styles.item}
                    aria-current={selected?.id === row.id ? 'true' : undefined}
                    onClick={() => { setSelectedId(row.id); setEditing(true) }}
                  ><LiquidLens radius={24} /><ActionIcon name="edit" />
                    <span>Editar {row.name}</span>
                    <span className="catalog-copy-status">{searchLabel(row)}</span>
                  </button>
                ))}
              </div>
            </div>
            <OverlayDialog open={editing && !!selected} title={'Editar texto de ' + (selected?.name ?? 'catálogo')} onClose={() => setEditing(false)}>{selected ? (
              <FacetEditor
                key={selected.id}
                kind={kind}
                row={selected}
                value={draft}
                onChange={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))}
                onSaved={(next) => { replace(kind, next); setEditing(false) }}
              />
            ) : null}</OverlayDialog>
          </div>
        </>
      ) : null}
    </section>
  )
}
