'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAreaSession } from '@/components/domain/panel'
import { Button } from '@/components/ui/button'
import { FormSteps } from '@/components/ui/form-steps'
import { ActionIcon } from '@/components/ui/action-icon'
import { FacetIcon } from '@/components/ui/facet-badge'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { spreadFacets } from '@/domain/facets'
import { trackMeta } from '@/domain/meta-pixel'
import { trackGoogleAdsLinkSubmission } from '@/domain/google-ads'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/feedback/skeleton'
import styles from '@/features/link-submission/components/submission-form.module.css'

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
  const [step, setStep] = useState(0)

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
  const networkIcons = Object.fromEntries(networks.map(row => [row.id, <FacetIcon key={row.id} kind="network" slug={row.slug} size={20} />]))
  const nicheIcons = Object.fromEntries(niches.map(row => [row.id, <FacetIcon key={row.id} kind="niche" slug={row.slug} size={20} />]))

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || result) return
    if (step < 2) { setError(''); setStep(step + 1); return }
    if (!canonical) {
      setError('Informe uma URL https')
      return
    }
    setPending(true)
    setError('')
    try {
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
        if (sent.body.id && (sent.body.status === 'PENDING_MODERATION' || sent.body.status === 'PUBLISHED')) {
          trackGoogleAdsLinkSubmission(sent.body.id)
        }
        localStorage.removeItem(DRAFT_KEY)
        setResult(describeSubmission(sent.body.status))
        return
      }
      setError(sent.body.message ?? 'Envio não aceito.')
    } catch {
      setError('Não foi possível conectar. Seu rascunho foi mantido. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <form className={`form-grid ${styles.form}`} data-layout="submission-form" onSubmit={onSubmit}>
        {!confirmed ? <p>Confirme o e-mail para enviar um link</p> : null}
        <FormSteps labels={['Título e acesso', 'Assunto e descrição', 'Conferir e enviar']} current={step} onBack={setStep} />
        <fieldset hidden={step !== 0} disabled={step !== 0} className={styles.stepFields}><legend className={styles.srOnly}>Título e acesso</legend>
        <div className={styles.context}><span>Publicação grátis</span>{slotsUsed !== null ? <span>Vagas em uso: {slotsUsed} de 4.</span> : <span role="status" aria-label="Carregando vagas"><Skeleton width={130} height={21} /></span>}</div>
        <Field label="Título do link" hint="Nome do grupo, canal ou página. Ex.: Receitas da Ana. Não coloque seu nome pessoal."><Input name="name" placeholder="Ex.: Receitas da Ana" value={draft.name} onChange={(event) => update({ name: event.target.value })} required /></Field>
        <div>
          <Field label="Link de acesso" icon={<ActionIcon name="link" />} hint="Cole o endereço completo, começando com https://."><Input name="url" type="url" autoComplete="url" placeholder="https://" value={draft.url} onChange={(event) => update({ url: event.target.value })} required /></Field>
          {canonical ? <p className={styles.preview}>{canonical}</p> : null}
        </div>
        </fieldset>
        <fieldset hidden={step !== 1} disabled={step !== 1} className={styles.stepFields}><legend className={styles.srOnly}>Assunto e descrição</legend>
        <div className={styles.description}><Field label="Descrição" hint="Explique o que a pessoa vai encontrar ao acessar."><TextArea name="description" value={draft.description} onChange={(event) => update({ description: event.target.value })} required /></Field></div>
        <fieldset className={styles.facets}>
          <legend>Organização no catálogo</legend>
          <Field label="Rede do link" icon={<ActionIcon name="network" />} hint="Onde o link abre, como WhatsApp ou Telegram.">
            <Select icon={<ActionIcon name="network" />} optionIcons={networkIcons} name="networkId" value={draft.networkId} onChange={(event) => update({ networkId: event.target.value })} required>
              <option value="">Escolha</option>
              {networkOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Field label="Assunto do link" icon={<ActionIcon name="tag" />} hint="Escolha o tema que melhor descreve o conteúdo.">
            <Select icon={<ActionIcon name="tag" />} optionIcons={nicheIcons} name="nicheId" value={draft.nicheId} onChange={(event) => update({ nicheId: event.target.value })} required>
              <option value="">Escolha</option>
              {nicheOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
        </fieldset>
        </fieldset>
        {step === 2 ? <dl className={styles.review}><div><dt>Título do link</dt><dd>{draft.name}</dd></div><div><dt>Link de acesso</dt><dd>{draft.url}</dd></div><div><dt>Descrição</dt><dd>{draft.description}</dd></div><div><dt>Rede do link</dt><dd>{networks.find(row => row.id === draft.networkId)?.name}</dd></div><div><dt>Assunto do link</dt><dd>{niches.find(row => row.id === draft.nicheId)?.name}</dd></div></dl> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.stepActions}>{step > 0 ? <Button type="button" variant="secondary" disabled={pending} onClick={() => setStep(step - 1)}><ActionIcon name="back" />Voltar</Button> : null}<Button type="submit" loading={pending} disabled={result !== null || !confirmed || session?.status === 'BANNED'}><ActionIcon name={step === 2 ? 'save' : 'next'} />{step === 2 ? 'Enviar' : 'Continuar'}</Button></div>
      </form>
      <dialog ref={dialogRef} className="age-dialog" aria-labelledby="submit-result-title">
        {result ? (
          <>
            <h2 id="submit-result-title">{result.title}</h2>
            <p>{result.detail}</p>
            <div className="age-dialog-actions">
              <Button type="button" onClick={() => router.push(LINKS_HREF)}><ActionIcon name="link" />Ver meus links</Button>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  )
}
