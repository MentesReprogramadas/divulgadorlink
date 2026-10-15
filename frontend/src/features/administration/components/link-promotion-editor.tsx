'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { api } from '@/lib/api'
import styles from './link-promotion-editor.module.css'

type Surface = 'SEARCH' | 'NICHE' | 'HOME'
type Promotion = { id: string; surface: Surface; administrative?: boolean; expiresAt: string | null }
type PromotionContext = { promotions: Promotion[]; allowedSurfaces: Surface[]; eligible: boolean }
type LinkPromotionEditorProps = { linkId: string; linkName: string }
const LABELS: Record<Surface, string> = { SEARCH: 'Busca', NICHE: 'Categoria', HOME: 'Página inicial' }
const PLACEMENTS = [
  { value: 'SEARCH', label: 'Busca' }, { value: 'NICHE', label: 'Categoria' },
  { value: 'HOME', label: 'Página inicial' }, { value: 'SEARCH+NICHE', label: 'Busca e categoria' },
  { value: 'SEARCH+NICHE+HOME', label: 'Busca, categoria e página inicial' },
]

function localDate(value: string): string {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function LinkPromotionEditor({ linkId, linkName }: LinkPromotionEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pendingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState<PromotionContext | null>(null)
  const [failed, setFailed] = useState(false)
  const [placement, setPlacement] = useState('SEARCH+NICHE')
  const [period, setPeriod] = useState('7')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setFailed(false)
    try {
      const result = await api<PromotionContext>(`/v1/admin/links/${linkId}/promotions`)
      if (result.status !== 200) { setFailed(true); return }
      setContext(result.body)
      const admin = result.body.promotions.filter(row => row.administrative)
      if (admin.length) {
        setPlacement(['SEARCH', 'NICHE', 'HOME'].filter(surface => admin.some(row => row.surface === surface)).join('+'))
        setPeriod(admin[0].expiresAt ? 'custom' : 'indefinite')
        setEnd(admin[0].expiresAt ? localDate(admin[0].expiresAt) : '')
      } else {
        const available = PLACEMENTS.filter(item => item.value.split('+').every(surface => result.body.allowedSurfaces.includes(surface as Surface) && !result.body.promotions.some(row => row.surface === surface)))
        setPlacement(available.find(item => item.value === 'SEARCH+NICHE')?.value ?? available[0]?.value ?? '')
      }
    } catch { setFailed(true) }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  function start() {
    setContext(null)
    setError('')
    setNotice('')
    setPeriod('7')
    setPlacement('SEARCH+NICHE')
    setOpen(true)
    void load()
  }

  async function save(remove = false) {
    if (pendingRef.current) return
    setError('')
    let expiresAt: string | null = null
    if (!remove && period !== 'indefinite') {
      const date = period === 'custom' ? new Date(end) : new Date(Date.now() + Number(period) * 86_400_000)
      if (!Number.isFinite(date.getTime()) || date <= new Date()) { setError('Escolha uma data de término no futuro.'); return }
      expiresAt = date.toISOString()
    }
    pendingRef.current = true
    setBusy(true)
    try {
      const result = await api<{ message?: string }>(`/v1/admin/links/${linkId}/promotions`, {
        method: remove ? 'DELETE' : 'PUT',
        ...(remove ? {} : { body: JSON.stringify({ surfaces: placement.split('+'), expiresAt }) }),
      })
      if (result.status !== 200) { setError(result.body.message ?? 'Não foi possível salvar. Tente novamente.'); return }
      setNotice(remove ? 'Destaque administrativo removido.' : period === 'indefinite' ? 'Destaque salvo sem prazo de término.' : 'Destaque salvo com período definido.')
      setOpen(false)
    } catch { setError('Falha de conexão. Tente novamente. Seus dados foram mantidos.') }
    finally { pendingRef.current = false; setBusy(false) }
  }

  const paid = context?.promotions.filter(row => !row.administrative) ?? []
  const admin = context?.promotions.filter(row => row.administrative) ?? []
  const placements = PLACEMENTS.filter(item => item.value.split('+').every(surface => context?.allowedSurfaces.includes(surface as Surface)))
  const hasPlacement = placements.some(item => !paid.some(row => item.value.split('+').includes(row.surface)))

  return (
    <div className={styles.root}>
      <Button type="button" variant="secondary" onClick={start}>Gerenciar destaque</Button>
      <p role="status" className={styles.notice}>{notice}</p>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={`promotion-title-${linkId}`} onCancel={event => { event.preventDefault(); if (!pendingRef.current) setOpen(false) }}>
        <form className={styles.form} onSubmit={event => { event.preventDefault(); void save() }}>
          <header>
            <p className={styles.kicker}>Destaque administrativo</p>
            <h2 id={`promotion-title-${linkId}`}>{linkName}</h2>
            <p>Começa ao salvar, sem cobrança. O link mantém a identificação de patrocinado no catálogo.</p>
          </header>
          {failed ? <div role="alert"><p>Não foi possível carregar o destaque.</p><Button type="button" variant="secondary" onClick={() => void load()}>Tentar novamente</Button></div> : !context ? <p role="status">Carregando destaque…</p> : <>
            {paid.length ? <p className={styles.info}>Destaque pago em: {paid.map(row => LABELS[row.surface]).join(', ')}. Estes locais não podem ser substituídos.</p> : null}
            {admin.length ? <p className={styles.info}>Atual: {admin.map(row => LABELS[row.surface]).join(', ')} · {admin[0].expiresAt ? `até ${new Date(admin[0].expiresAt).toLocaleString('pt-BR')}` : 'Sem prazo de término'}</p> : null}
            {!context.eligible ? <p role="alert">Somente links publicados de contas ativas podem receber destaque.</p> : <>
              <Field label="Onde destacar" hint="Escolha os locais de exibição no catálogo.">
                <Select autoFocus value={placement} onChange={event => setPlacement(event.target.value)} disabled={busy}>
                  {!hasPlacement ? <option value="">Todos os locais já têm destaque pago</option> : null}
                  {placements.map(item => <option key={item.value} value={item.value} disabled={paid.some(row => item.value.split('+').includes(row.surface))}>{item.label}</option>)}
                </Select>
              </Field>
              <Field label="Período">
                <Select value={period} onChange={event => setPeriod(event.target.value)} disabled={busy}>
                  <option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option>
                  <option value="custom">Escolher data de término</option><option value="indefinite">Sem prazo (indeterminado)</option>
                </Select>
              </Field>
              {period === 'custom' ? <Field label="Data e hora de término" hint="Use o horário local do seu dispositivo."><Input type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} disabled={busy} /></Field> : null}
              {period === 'indefinite' ? <p className={styles.info}>O destaque ficará ativo até ser removido pelo admin ou o link sair do ar.</p> : null}
            </>}
          </>}
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            {context?.eligible ? <Button type="submit" disabled={busy || !hasPlacement}>{busy ? 'Salvando…' : 'Salvar destaque'}</Button> : null}
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
            {admin.length ? <Button type="button" variant="danger" disabled={busy} onClick={() => void save(true)}>Remover destaque</Button> : null}
          </div>
        </form>
      </dialog>
    </div>
  )
}
