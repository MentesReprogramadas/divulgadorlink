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

export default function Page() {
  const session = useAreaSession()
  const [networks, setNetworks] = useState<Facet[]>([])
  const [niches, setNiches] = useState<Facet[]>([])
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    void api('/v1/links/submission-started')
  }, [])

  useEffect(() => {
    void api<{ networks: Facet[]; niches: Facet[] }>('/v1/home').then((result) => {
      setNetworks(result.body.networks ?? [])
      setNiches(result.body.niches ?? [])
    })
  }, [])

  const confirmed = session?.canSubmit === true
  const canonical = preview(url)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canonical) {
      setError('Informe uma URL https')
      return
    }
    const data = new FormData(event.currentTarget)
    const result = await api<{ status?: string; message?: string }>('/v1/links', {
      method: 'POST',
      body: JSON.stringify({
        url,
        name: data.get('name'),
        description: data.get('description'),
        networkId: data.get('networkId'),
        nicheId: data.get('nicheId'),
      }),
    })
    if (result.status === 201 && result.body.status === 'PUBLISHED') setStatus('Publicado')
    else if (result.status === 201) setStatus('Em revisão')
    else setError(result.body.message ?? 'Envio não aceito.')
  }

  return (
    <>
      <h2 className="panel-section-title">Novo link</h2>
      {!confirmed ? <p>Confirme o e-mail para enviar um link</p> : null}
      <form className="form-grid" onSubmit={onSubmit}>
        <Field label="Nome"><Input name="name" required /></Field>
        <Field label="Descrição"><TextArea name="description" required /></Field>
        <Field label="URL"><Input name="url" value={url} onChange={(event) => setUrl(event.target.value)} required /></Field>
        <div>
          {canonical ? <p className="panel-meta">{canonical}</p> : null}
          <Field label="Rede">
            <Select name="networkId" required>
              {networks.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Field label="Nicho">
            <Select name="nicheId" required>
              {niches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {status ? <p>{status}</p> : null}
        <Button type="submit" disabled={!confirmed || session?.status === 'BANNED'}>Enviar</Button>
      </form>
    </>
  )
}
