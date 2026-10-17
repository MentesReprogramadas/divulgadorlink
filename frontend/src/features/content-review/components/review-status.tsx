'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Field, TextArea } from '@/components/ui/input'
import type { ContentReview } from '../review-contract'
import styles from './review-status.module.css'
export function ReviewStatus({ review, pending, onAppeal }: { review?: ContentReview | null; pending: boolean; onAppeal: (text: string) => Promise<void> }) {
  const [open, setOpen] = useState(false), [text, setText] = useState(''), [error, setError] = useState('')
  if (!review || !['PENDING', 'REJECTED'].includes(review.status)) return null
  return <section className={styles.status} aria-label="Situação da revisão"><div className={styles.header}><Badge tone={review.status === 'PENDING' ? 'wait' : 'warn'}>{review.status === 'PENDING' ? 'Em revisão humana' : 'Recusado'}</Badge><span>Versão {review.version}</span></div>
    {review.status === 'PENDING' ? <p>A equipe está analisando este envio.</p> : <><p>{review.reason || 'A equipe não aprovou esta versão.'}</p>{review.canAppeal ? <Button type="button" disabled={pending} onClick={() => { setError(''); setOpen(true) }}><ActionIcon name="appeal" />Contestar recusa</Button> : <p>A contestação desta versão já foi utilizada. Você pode corrigir e enviar uma nova versão.</p>}</>}
    <OverlayDialog open={open} title="Contestar recusa" onClose={() => { if (!pending) setOpen(false) }}><form className={styles.form} onSubmit={event => { event.preventDefault(); setError(''); void onAppeal(text).then(() => { setOpen(false); setText('') }).catch(reason => setError(reason instanceof Error ? reason.message : 'Tente novamente.')) }}><Field label="Por que devemos reavaliar?" hint="Explique o contexto ou o que considera incorreto na decisão."><TextArea required maxLength={2000} rows={4} value={text} disabled={pending} onChange={event => setText(event.target.value)} /></Field>{error ? <p role="alert">{error}</p> : null}<Button loading={pending}><ActionIcon name="appeal" />Enviar contestação</Button></form></OverlayDialog>
  </section>
}
