'use client'

import { useEffect, useState } from 'react'
import { useAreaSession } from '@/components/domain/panel'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { api } from '@/lib/api'

type Facet = { id: string; name: string }

function preview(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    url.hostname = url.hostname.toLowerCase()
    url.hash = ''
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)
    return url.toString()
  } catch {
    return null
  }
}

const DRAFT_KEY = 'tla-link-draft'

type Draft = { name: string; description: string; url: string; networkId: string; nicheId: string }

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return { name: '', description: '', url: '', networkId: '', nicheId: '' }
    const parsed = JSON.parse(raw) as Partial<Draft>
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      url: parsed.url ?? '',
      networkId: parsed.networkId ?? '',
      nicheId: parsed.nicheId ?? '',
    }
  } catch {
    return { name: '', description: '', url: '', networkId: '', nicheId: '' }
  }
}

export default function Page() {
  const session = useAreaSession()
  const [networks, setNetworks] = useState<Facet[]>([])
  const [niches, setNiches] = useState<Facet[]>([])
  const [draft, setDraft] = useState<Draft>({ name: '', description: '', url: '', networkId: '', nicheId: '' })
  const [slotsUsed, setSlotsUsed] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDraft(readDraft())
    setReady(true)
    void api('/v1/links/submission-started')
    void api<{ slotsUsed?: number }>('/v1/links/mine?pageSize=24').then((result) => {
      if (typeof result.body.slotsUsed === 'number') setSlotsUsed(result.body.slotsUsed)
    })
    void api<{ networks: Facet[]; niches: Facet[] }>('/v1/home').then((result) => {
      setNetworks(result.body.networks ?? [])
      setNiches(result.body.niches ?? [])
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, ready])

  const confirmed = session?.canSubmit === true
  const canonical = preview(draft.url)

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canonical) {
      setError('Informe uma URL https')
      return
    }
    setPending(true)
    setError('')
    const result = await api<{ status?: string; message?: string }>('/v1/links', {
      method: 'POST',
      body: JSON.stringify({
        url: draft.url,
        name: draft.name,
        description: draft.description,
        networkId: draft.networkId,
        nicheId: draft.nicheId,
      }),
    })
    setPending(false)
    if (result.status === 201) {
      localStorage.removeItem(DRAFT_KEY)
      setStatus('Enviado para análise.')
      return
    }
    setError(result.body.message ?? 'Envio não aceito.')
  }

  return (
    <>
      <h2 className="panel-section-title">Novo link</h2>
      {slotsUsed !== null ? <p>Vagas em uso: {slotsUsed} de 4.</p> : null}
      {!confirmed ? <p>Confirme o e-mail para enviar um link</p> : null}
      <form className="form-grid" onSubmit={onSubmit}>
        <Field label="Nome"><Input name="name" value={draft.name} onChange={(event) => update({ name: event.target.value })} required /></Field>
        <Field label="Descrição"><TextArea name="description" value={draft.description} onChange={(event) => update({ description: event.target.value })} required /></Field>
        <Field label="URL"><Input name="url" value={draft.url} onChange={(event) => update({ url: event.target.value })} required /></Field>
        <div>
          {canonical ? <p className="panel-meta">{canonical}</p> : null}
          <Field label="Rede">
            <Select name="networkId" value={draft.networkId} onChange={(event) => update({ networkId: event.target.value })} required>
              <option value="">Escolha</option>
              {networks.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Field label="Nicho">
            <Select name="nicheId" value={draft.nicheId} onChange={(event) => update({ nicheId: event.target.value })} required>
              <option value="">Escolha</option>
              {niches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {status ? <p>{status}</p> : null}
        {status ? <a href="/painel/links">Ver meus links</a> : null}
        <Button type="submit" disabled={pending || !confirmed || session?.status === 'BANNED'}>Enviar</Button>
      </form>
    </>
  )
}
