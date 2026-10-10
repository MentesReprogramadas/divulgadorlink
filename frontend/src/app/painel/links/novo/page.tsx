'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAreaSession } from '@/components/domain/panel'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { spreadFacets } from '@/domain/facets'
import { trackMeta } from '@/domain/meta-pixel'
import { api } from '@/lib/api'

type Facet = { id: string; name: string; slug: string }

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
const LINKS_HREF = '/painel/links'

type SubmissionResult = { title: string; detail: string }

function describeSubmission(status: string | undefined): SubmissionResult {
  if (status === 'PRE_REJECTED') {
    return {
      title: 'Envio não aceito',
      detail: 'Este link não entrou na fila. Ele aparece em Links como rejeitado.',
    }
  }
  return {
    title: 'Enviado para análise.',
    detail: 'A análise é humana. O link aparece em Links como em revisão.',
  }
}

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
  const router = useRouter()
  const session = useAreaSession()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [networks, setNetworks] = useState<Facet[]>([])
  const [niches, setNiches] = useState<Facet[]>([])
  const [draft, setDraft] = useState<Draft>({ name: '', description: '', url: '', networkId: '', nicheId: '' })
  const [slotsUsed, setSlotsUsed] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDraft(readDraft())
    setReady(true)
    void api<{ eventId?: string; recorded?: boolean }>('/v1/links/submission-started').then((result) => {
      if (result.body.recorded && result.body.eventId) trackMeta('StartLinkSubmission', result.body.eventId)
    })
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

  useEffect(() => {
    const dialog = dialogRef.current
    if (!result || !dialog) return
    if (!dialog.open) {
      try { dialog.showModal() } catch { dialog.open = true }
    }
    const timer = window.setTimeout(() => router.push(LINKS_HREF), 2500)
    function leave(event: Event) {
      event.preventDefault()
      window.clearTimeout(timer)
      router.push(LINKS_HREF)
    }
    dialog.addEventListener('cancel', leave)
    return () => {
      window.clearTimeout(timer)
      dialog.removeEventListener('cancel', leave)
    }
  }, [result, router])

  const confirmed = session?.canSubmit === true
  const canonical = preview(draft.url)
  const networkOptions = spreadFacets(networks)
  const nicheOptions = spreadFacets(niches)

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
    const sent = await api<{ id?: string; status?: string; message?: string }>('/v1/links', {
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
    if (sent.status === 201) {
      if (sent.body.id) trackMeta('SubmitLink', sent.body.id)
      localStorage.removeItem(DRAFT_KEY)
      setResult(describeSubmission(sent.body.status))
      return
    }
    setError(sent.body.message ?? 'Envio não aceito.')
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
              {networkOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Field label="Nicho">
            <Select name="nicheId" value={draft.nicheId} onChange={(event) => update({ nicheId: event.target.value })} required>
              <option value="">Escolha</option>
              {nicheOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        <Button type="submit" disabled={pending || result !== null || !confirmed || session?.status === 'BANNED'}>Enviar</Button>
      </form>
      <dialog ref={dialogRef} className="age-dialog" aria-labelledby="submit-result-title">
        {result ? (
          <>
            <h2 id="submit-result-title">{result.title}</h2>
            <p>{result.detail}</p>
            <div className="age-dialog-actions">
              <Button type="button" onClick={() => router.push(LINKS_HREF)}>Ver meus links</Button>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  )
}
