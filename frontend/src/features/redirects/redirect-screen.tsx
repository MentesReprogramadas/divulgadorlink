'use client'
import { DatePicker } from '@/components/ui/date-picker'
import { ReviewStatus } from '@/features/content-review/components/review-status'
import { sendContentAppeal } from '@/features/content-review/review-api'

import { RedirectListSkeleton } from './components/redirect-skeleton'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RedirectGrid } from './components/redirect-grid'
import { Field, Input } from '@/components/ui/input'
import { RedirectFields } from './components/redirect-fields'
import { RedirectHistory } from './components/redirect-history'
import { emptyRedirect, type RedirectFieldsValue, type RedirectPage, type RedirectDetail } from './redirect-contract'
import { RedirectRequestError, redirectRequest } from './redirect-api'
import { QrDialog } from '@/features/permanent-qr/qr-dialog'
import { stableQrTarget, type StableQrTarget } from '@/features/permanent-qr/qr-target'
import styles from './components/redirects.module.css'

type Attempt = { id: string | null; fields: string; key: string; version: number }
export function RedirectScreen() {
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState('address')
  const pageRef = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null), returnId = useRef<string | null>(null)
  const [page, setPage] = useState<RedirectPage>({ items: [], nextCursor: null }), [detail, setDetail] = useState<RedirectDetail | null>(null)
  const [value, setValue] = useState<RedirectFieldsValue>(emptyRedirect), [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmDisable, setConfirmDisable] = useState(false)
  const [range, setRange] = useState({ from: '', to: '' }), [stableUrl, setStableUrl] = useState('')
  const [qrTarget, setQrTarget] = useState<StableQrTarget | null>(null)
  const qrTrigger = useRef<HTMLButtonElement | null>(null)
  const busy = useRef(false), attempt = useRef<Attempt | null>(null), status = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => { if (notice) status.current?.focus() }, [notice])
  useLayoutEffect(() => {
    if (detail && !editing && !notice) heading.current?.focus()
    else if (!detail && returnId.current) {
      Array.from(pageRef.current?.querySelectorAll<HTMLButtonElement>('[data-redirect-id]') ?? []).find(card => card.dataset.redirectId === returnId.current)?.focus()
    }
  }, [detail?.id, editing])
  const loadList = useCallback(async () => { const result = await redirectRequest<RedirectPage>(); setPage(result); setPhase('ready') }, [])
  useEffect(() => { void loadList().catch(e => { setError(e.message); setPhase('error') }) }, [loadList])
  async function loadDetail(id: string, preserve = false, query = '') {
    const result = await redirectRequest<RedirectDetail>('/' + id + query); setDetail(result); setStableUrl(new URL(result.stablePath, location.origin).href); setConfirmDisable(false)
    if (!preserve && result.revisions[0]) { const row = result.revisions[0]; setValue({ label: row.label, destinationUrl: row.destinationUrl, requiresAge: row.requiresAge }); attempt.current = null }
    return result
  }
  async function action(work: () => Promise<void>) {
    if (busy.current) return
    busy.current = true; setPending(true); setError(''); setNotice('')
    try { await work() }
    catch (e) {
      const original = e instanceof Error ? e.message : 'Não foi possível concluir. Os campos foram mantidos.'
      if (e instanceof RedirectRequestError && e.resource) {
        attempt.current = null
        try { await loadDetail(e.resource.id, true); await loadList() } catch { /* Preserve the original failure and entered fields. */ }
      }
      setError(original)
    } finally { busy.current = false; setPending(false) }
  }
  async function save() {
    const fields = JSON.stringify(value), id = detail?.id ?? null
    if (!attempt.current || attempt.current.fields !== fields || attempt.current.id !== id) attempt.current = { id, fields, key: crypto.randomUUID(), version: detail?.version ?? 0 }
    const current = attempt.current
    const result = await redirectRequest<{ id: string; destinationRevision: { status: string } }>(id ? '/' + id + '/destinations' : '', { method: 'POST', body: JSON.stringify({ ...value, requestKey: current.key, expectedRevision: current.version }) })
    attempt.current = null
    await loadDetail(result.id, true); await loadList()
    setEditing(false)
    setTab('address')
    setNotice(result.destinationRevision.status === 'APPROVED' ? 'Destino validado. O endereço permanente está pronto para compartilhar.' : result.destinationRevision.status === 'PENDING_REVIEW' ? 'Convite enviado para revisão humana.' : 'Tentativa registrada. Confira o estado no histórico.')
  }
  const active = detail?.revisions.find(row => row.id === detail.activeRevisionId)
  const actions = <WorkspaceActions><Button disabled={pending || phase !== 'ready'} onClick={() => { setDetail(null); setStableUrl(''); setValue(emptyRedirect()); attempt.current = null; setError(''); setNotice(''); setConfirmDisable(false); setEditing(true) }}><ActionIcon name="plus" />Novo link permanente</Button><RefreshButton disabled={pending} onClick={() => void action(async () => { await loadList(); if (detail) await loadDetail(detail.id, true); setNotice('Dados atualizados. Os campos foram mantidos.') })} /></WorkspaceActions>
  const addressContent = detail ? <>
    <ReviewStatus review={detail.revisions[0]?.review} pending={pending} onAppeal={async text => { const review = detail.revisions[0]?.review; if (!review || busy.current) throw new Error('Aguarde e tente novamente.'); busy.current = true; setPending(true); try { await sendContentAppeal(review.id, text); await loadDetail(detail.id, true); await loadList(); setNotice('Contestação enviada para revisão humana.') } finally { busy.current = false; setPending(false) } }} />
    {detail.disabled ? <p className={styles.warning}>Endereço desativado definitivamente. Ele não encaminha mais visitantes.</p> : !active ? <p className={styles.warning}>{detail.revisions[0]?.review?.status === 'PENDING' ? 'Aguardando aprovação para liberar este convite.' : 'Ainda sem destino aprovado. Você pode corrigir o envio ou contestar uma recusa.'}</p> : null}
    <section className={styles.section} aria-label="Endereço permanente">
      <header className={styles.sectionHeader}><h3>Endereço para compartilhar</h3><Badge tone={detail.disabled ? 'muted' : active ? 'ok' : 'wait'}>{detail.disabled ? 'Desativado' : active ? 'Publicado' : 'Sem destino aprovado'}</Badge></header>
      <div className={styles.shareRow}><Field label="Link permanente"><Input className={styles.inlineInput} readOnly value={stableUrl} onFocus={e => e.currentTarget.select()} /></Field><Button variant="secondary" onClick={() => void action(async () => { try { await navigator.clipboard.writeText(stableUrl); setNotice('Endereço copiado.') } catch { throw new Error('Selecione o endereço acima e copie manualmente.') } })} disabled={pending}><ActionIcon name="copy" />Copiar endereço</Button><Button disabled={pending || detail.disabled || !detail.activeRevisionId} onClick={event => { qrTrigger.current = event.currentTarget; void action(async () => { const current = await loadDetail(detail.id, true); if (current.disabled || !current.activeRevisionId) throw new Error('Este convite precisa estar ativo para gerar o QR Code.'); setQrTarget(stableQrTarget(window.location.origin, { kind: 'REDIRECT', path: current.stablePath })) }) }}><ActionIcon name="qr" />QR Code</Button></div>
      <a className={styles.publicLink} href={detail.stablePath}>Testar endereço público <ActionIcon name="external" /></a>
      {active ? <div className={styles.destination}><div><span className={styles.note}>Destino atual</span><h3>{active.label}</h3><p className={styles.url}>{active.destinationUrl}</p></div>{!detail.disabled ? <Button variant="secondary" disabled={pending} onClick={() => setEditing(true)}><ActionIcon name="edit" />Editar destino</Button> : null}</div> : !detail.disabled ? <div className={styles.actions}><Button variant="secondary" disabled={pending} onClick={() => setEditing(true)}><ActionIcon name="edit" />Editar destino</Button></div> : null}
    </section>
    {!detail.disabled ? <details className={styles.management}><summary>Gerenciar endereço</summary><div className={styles.managementBody}><p className={styles.note}>A desativação é definitiva e interrompe o encaminhamento de visitantes.</p>{confirmDisable ? <div className={styles.warning} role="group" aria-label="Confirmar desativação"><p>Desativar este endereço definitivamente? Ele deixará de encaminhar visitantes.</p><div className={styles.actions}><Button variant="danger" disabled={pending} onClick={() => void action(async () => { await redirectRequest('/' + detail.id + '/disable', { method: 'POST', body: JSON.stringify({ expectedRevision: detail.version }) }); await loadDetail(detail.id, true); await loadList(); setNotice('Endereço desativado.') })}><ActionIcon name="disable" />Confirmar desativação</Button><Button variant="secondary" disabled={pending} onClick={() => setConfirmDisable(false)}><ActionIcon name="close" />Cancelar</Button></div></div> : <Button variant="danger" disabled={pending} onClick={() => setConfirmDisable(true)}><ActionIcon name="disable" />Desativar endereço</Button>}</div></details> : null}
  </> : null
  const historyContent = detail ? <>
    <form className={styles.range} aria-label="Filtrar acessos" onSubmit={e => { e.preventDefault(); void action(async () => { const query = new URLSearchParams(); if (range.from) query.set('from', range.from); if (range.to) query.set('to', range.to); await loadDetail(detail.id, true, '?' + query); setNotice('Período atualizado.') }) }}><Field label="De"><DatePicker className={styles.inlineInput} value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></Field><Field label="Até"><DatePicker className={styles.inlineInput} value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></Field><Button disabled={pending}><ActionIcon name="filter" />Filtrar acessos</Button></form>
    <RedirectHistory revisions={detail.revisions} activeId={detail.activeRevisionId} />
  </> : null
  return <section ref={pageRef} className={styles.page} aria-label="Links permanentes">
    {error && !editing ? <p className={styles.error} role="alert">{error}</p> : null}<p className={styles.status} ref={status} role="status" tabIndex={-1}>{notice}</p>
    {detail ? <>
      <header className={styles.detailHeader}><div className={styles.heading}><Button variant="secondary" disabled={pending} onClick={() => { returnId.current = detail.id; setDetail(null); setError(''); setNotice(''); setConfirmDisable(false) }}><ActionIcon name="back" />Voltar</Button><h2 ref={heading} tabIndex={-1}>{detail.revisions[0]?.label ?? 'Convite sem histórico'}</h2></div><RefreshButton disabled={pending} onClick={() => void action(async () => { await loadList(); await loadDetail(detail.id, true); setNotice('Dados atualizados. Os campos foram mantidos.') })} /></header>
      <Tabs label="Detalhes do convite" value={tab} onChange={setTab} items={[{ id: 'address', label: 'Endereço', content: addressContent }, { id: 'history', label: 'Histórico e acessos', content: historyContent }]} />
    </> : <>{actions}{phase === 'loading' ? <RedirectListSkeleton /> : phase === 'error' ? <p>Atualize os dados para tentar novamente.</p> : <><RedirectGrid items={page.items} pending={pending} onOpen={id => { setTab('address'); setRange({ from: '', to: '' }); void action(async () => { await loadDetail(id) }) }} />{page.nextCursor ? <div className={styles.actions}><Button variant="secondary" disabled={pending} onClick={() => void action(async () => { const next = await redirectRequest<RedirectPage>('?cursor=' + page.nextCursor); setPage(previous => ({ items: [...previous.items, ...next.items.filter(item => !previous.items.some(p => p.id === item.id))], nextCursor: next.nextCursor })) })}><ActionIcon name="loadMore" />Mais endereços</Button></div> : null}</>}</>}
    {!detail?.disabled ? <OverlayDialog open={editing} title={detail ? 'Atualizar destino' : 'Criar endereço permanente'} onClose={() => { if (!pending) setEditing(false) }}><p className={styles.warning}>Todo novo destino passa por validação automática. Se precisar de revisão humana, a equipe decide. Você pode contestar uma recusa. O destino anterior continua ativo.</p><div className={styles.frame}><form className={styles.form} aria-label="Editar convite permanente" onSubmit={e => { e.preventDefault(); void action(save) }}><fieldset className={styles.controls} disabled={pending}><legend className={styles.legend}>Dados do convite</legend><RedirectFields value={value} onChange={setValue} /><div className={styles.actions}><Button type="submit" loading={pending}><ActionIcon name="save" />Validar e salvar destino</Button></div></fieldset></form></div>{error ? <p className={styles.error} role="alert">{error}</p> : null}</OverlayDialog> : null}
    {qrTarget ? <QrDialog target={qrTarget} trigger={qrTrigger.current} onClose={() => setQrTarget(null)} /> : null}
  </section>
}
