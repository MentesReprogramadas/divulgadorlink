'use client'

import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/forms/login-form'
import { Button } from '@/components/ui/button'
import { Input, Select, TextArea } from '@/components/ui/input'
import type { Session } from '@/domain/session'
import { api, currentSession } from '@/lib/api'

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
  const [session, setSession] = useState<Session | null>(null)
  const [networks, setNetworks] = useState<Facet[]>([])
  const [niches, setNiches] = useState<Facet[]>([])
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    void (async () => {
      const current = await currentSession()
      setSession(current)
      if (!current) return
      const result = await api<{ networks: Facet[]; niches: Facet[] }>('/v1/home')
      setNetworks(result.body.networks ?? [])
      setNiches(result.body.niches ?? [])
    })()
  }, [])

  if (!session) return <main><LoginForm /></main>
  const confirmed = session.canSubmit
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
    <main>
      <h1>Novo link</h1>
      {!confirmed ? <p>Confirme o e-mail e o telefone para enviar um link</p> : null}
      <form onSubmit={onSubmit}>
        <label>Nome<Input name="name" required /></label>
        <label>Descrição<TextArea name="description" required /></label>
        <label>URL<Input name="url" value={url} onChange={(event) => setUrl(event.target.value)} required /></label>
        {canonical ? <p>{canonical}</p> : null}
        <label>Rede
          <Select name="networkId" required>
            {networks.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </Select>
        </label>
        <label>Nicho
          <Select name="nicheId" required>
            {niches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </Select>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        {status ? <p>{status}</p> : null}
        <Button type="submit" disabled={!confirmed || session.status === 'BANNED'}>Enviar</Button>
      </form>
    </main>
  )
}
