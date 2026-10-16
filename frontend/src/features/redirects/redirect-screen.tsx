'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { RedirectFields } from './components/redirect-fields'
import { RedirectHistory } from './components/redirect-history'
import { emptyRedirect, revisionStatus, type RedirectFieldsValue, type RedirectPage, type RedirectDetail } from './redirect-contract'
import { RedirectRequestError, redirectRequest } from './redirect-api'
import styles from './components/redirects.module.css'

type Attempt = { id: string | null; fields: string; key: string; version: number }
export function RedirectScreen() {
  const [page, setPage] = useState<RedirectPage>({ items: [], nextCursor: null }), [detail, setDetail] = useState<RedirectDetail | null>(null)
  const [value, setValue] = useState<RedirectFieldsValue>(emptyRedirect), [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmDisable, setConfirmDisable] = useState(false)
  const [range, setRange] = useState({ from: '', to: '' }), [stableUrl, setStableUrl] = useState('')
  const busy = useRef(false), attempt = useRef<Attempt | null>(null), status = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => { if (notice) status.current?.focus() }, [notice])
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
    setNotice(result.destinationRevision.status === 'APPROVED' ? 'Destino validado. O endereço permanente está pronto para compartilhar.' : 'Tentativa registrada. Confira o estado no histórico.')
  }
  const active = detail?.revisions.find(row => row.id === detail.activeRevisionId)
  return <section className={styles.page} aria-label="Links permanentes">
    <header><h2>Links permanentes</h2><p className={styles.note}>Compartilhe um endereço fixo. Quando o convite mudar, atualize apenas o destino.</p></header>
    <div className={styles.actions}><Button variant="secondary" disabled={pending} onClick={() => void action(async () => { await loadList(); if (detail) await loadDetail(detail.id, true); setNotice('Dados atualizados. Os campos foram mantidos.') })}>Atualizar dados</Button><Button variant="secondary" disabled={pending} onClick={() => { setDetail(null); setStableUrl(''); setValue(emptyRedirect()); attempt.current = null; setError(''); setNotice(''); setConfirmDisable(false) }}>Novo link permanente</Button></div>
    {error ? <p role="alert">{error}</p> : null}<p className={styles.status} ref={status} role="status" tabIndex={-1}>{notice}</p>
    {phase === 'loading' ? <p role="status">Carregando convites…</p> : phase === 'error' ? <p>Atualize os dados para tentar novamente.</p> : <>
      <section className={styles.section} aria-label="Seus endereços"><h3>Seus endereços</h3>{!page.items.length ? <p className={styles.note}>Crie seu primeiro endereço permanente no formulário abaixo.</p> : <div className={styles.actions}>{page.items.map(item => <Button key={item.id} variant="secondary" aria-pressed={detail?.id === item.id} disabled={pending} onClick={() => void action(async () => { await loadDetail(item.id) })}>{item.latest?.label ?? 'Convite sem histórico'} · {item.disabled ? 'Desativado' : item.activeRevisionId ? 'Publicado' : item.latest ? revisionStatus[item.latest.status] : 'Sem destino'}</Button>)}</div>}{page.nextCursor ? <Button variant="secondary" disabled={pending} onClick={() => void action(async () => { const next = await redirectRequest<RedirectPage>('?cursor=' + page.nextCursor); setPage(previous => ({ items: [...previous.items, ...next.items.filter(item => !previous.items.some(p => p.id === item.id))], nextCursor: next.nextCursor })) })}>Mais endereços</Button> : null}</section>
      {detail ? <section className={styles.section} aria-label="Endereço permanente"><h3>Endereço para compartilhar</h3><div className={styles.frame}><Field label="Link permanente"><Input readOnly value={stableUrl} onFocus={e => e.currentTarget.select()} /></Field></div><div className={styles.actions}><Button variant="secondary" onClick={() => void action(async () => { try { await navigator.clipboard.writeText(stableUrl); setNotice('Endereço copiado.') } catch { throw new Error('Selecione o endereço acima e copie manualmente.') } })} disabled={pending}>Copiar endereço</Button><a href={detail.stablePath}>Testar endereço público</a></div><p className={styles.url}>{detail.disabled ? 'Endereço desativado definitivamente.' : active ? 'Destino atual: ' + active.label + ' · ' + active.destinationUrl : 'Ainda sem destino aprovado.'}</p></section> : null}
      {!detail?.disabled ? <section className={styles.section}><h3>{detail ? 'Atualizar destino' : 'Criar endereço permanente'}</h3><p className={styles.note}>Todo novo destino passa por validação automática. Se houver falha ou conteúdo suspeito, o destino anterior continua ativo.</p><div className={styles.frame}><form className={styles.form} aria-label="Editar convite permanente" onSubmit={e => { e.preventDefault(); void action(save) }}><fieldset className={styles.controls} disabled={pending}><legend className={styles.legend}>Dados do convite</legend><RedirectFields value={value} onChange={setValue} /><div className={styles.actions}><Button type="submit" loading={pending}>Validar e salvar destino</Button></div></fieldset></form></div></section> : null}
      {detail ? <><form className={styles.range} aria-label="Filtrar acessos" onSubmit={e => { e.preventDefault(); void action(async () => { const query = new URLSearchParams(); if (range.from) query.set('from', range.from); if (range.to) query.set('to', range.to); await loadDetail(detail.id, true, '?' + query); setNotice('Período atualizado.') }) }}><Field label="De"><Input type="date" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></Field><Field label="Até"><Input type="date" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></Field><Button disabled={pending}>Filtrar acessos</Button></form><RedirectHistory revisions={detail.revisions} activeId={detail.activeRevisionId} />{!detail.disabled ? confirmDisable ? <div role="group" aria-label="Confirmar desativação"><p>Desativar este endereço definitivamente? Ele deixará de encaminhar visitantes.</p><div className={styles.actions}><Button disabled={pending} onClick={() => void action(async () => { await redirectRequest('/' + detail.id + '/disable', { method: 'POST', body: JSON.stringify({ expectedRevision: detail.version }) }); await loadDetail(detail.id, true); await loadList(); setNotice('Endereço desativado.') })}>Confirmar desativação</Button><Button variant="secondary" disabled={pending} onClick={() => setConfirmDisable(false)}>Cancelar</Button></div></div> : <Button variant="secondary" disabled={pending} onClick={() => setConfirmDisable(true)}>Desativar endereço</Button> : null}</> : null}
    </>}
  </section>
}
