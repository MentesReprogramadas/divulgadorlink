'use client'

import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { ActionIcon, type ActionIconName } from '@/components/ui/action-icon'
import { formatCents } from '@/domain/money'
import { cents, inputDate, type AffiliateInstance, type AffiliateOffer, type AffiliateSegment, type OfferSeed } from './contracts'
import styles from './affiliates.module.css'

function Form({ children, onSubmit, label = 'Salvar', icon = 'save' }: { children: ReactNode; onSubmit: (data: FormData) => Promise<void>; label?: string; icon?: ActionIconName }) {
  const lock = useRef(false)
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const data = new FormData(event.currentTarget)
    lock.current = true; setPending(true); setError('')
    try { await onSubmit(data) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha de conexão. Seus dados foram mantidos.') }
    finally { lock.current = false; setPending(false) }
  }
  return <form className={styles.form} onSubmit={event => void submit(event)}>{children}{error ? <p className={styles.error} role="alert">{error}</p> : null}<Button loading={pending} type="submit"><ActionIcon name={icon} />{label}</Button></form>
}
const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

export { SegmentWizard as SegmentForm } from './segment-wizard'

export function InstanceForm({ instance, save }: { instance?: AffiliateInstance; save: (body: Record<string, unknown>) => Promise<void> }) {
  return <Form label={instance ? 'Salvar alterações' : 'Salvar e conectar WhatsApp'} icon={instance ? 'save' : 'qr'} onSubmit={data => save({ ...(!instance ? { name: value(data, 'name') } : {}), ...(value(data, 'ownerPhone') ? { ownerPhone: value(data, 'ownerPhone') } : {}) })}>
    <Field label="Nome para identificar esta conta" hint="Um apelido usado apenas no painel, como Principal 01 ou Atendimento. Não é o nome dos grupos."><Input name="name" required disabled={!!instance} defaultValue={instance?.name} minLength={2} maxLength={80} autoComplete="off" placeholder="Principal 01" /></Field>
    <Field label="Participante inicial dos grupos" hint="Informe outro número de WhatsApp, com país e DDD, somente números, que será adicionado aos novos grupos. A conta que cria os grupos será conectada pelo QR code. Necessário apenas para criar grupos automaticamente."><Input name="ownerPhone" type="tel" defaultValue={instance?.ownerPhone ?? ''} inputMode="tel" pattern="[0-9]{10,15}" minLength={10} maxLength={15} autoComplete="off" placeholder="5511999999999" /></Field>
  </Form>
}

export function OfferForm({ offer, product, segments, scopedSegment, save }: { offer?: AffiliateOffer; product?: OfferSeed; segments: AffiliateSegment[]; scopedSegment?: AffiliateSegment; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [expiration, setExpiration] = useState(inputDate(offer?.expiresAt))
  return <Form label={offer ? 'Salvar revisão' : 'Salvar oferta'} onSubmit={data => {
    if (!data.has('verified')) throw new Error('Confira o preço e o anúncio antes de salvar.')
    return save({ ...(!offer ? { segmentId: scopedSegment?.id ?? value(data, 'segmentId') } : {}), title: value(data, 'title'), productUrl: value(data, 'productUrl'), affiliateUrl: value(data, 'affiliateUrl'), priceCents: cents(value(data, 'price')), oldPriceCents: value(data, 'oldPrice') ? cents(value(data, 'oldPrice')) : null, imageUrl: value(data, 'imageUrl') || null, note: value(data, 'note'), expiresAt: expiration ? new Date(expiration).toISOString() : null, checkedAt: new Date().toISOString(), ...(offer ? { status: 'DRAFT' } : {}) })
  }}>
    {scopedSegment ? <p className={styles.contextNote}>Esta oferta será preparada para <strong>{scopedSegment.name}</strong> e enviada somente aos grupos dessa segmentação, após sua confirmação.</p> : <Field label="Segmentação da oferta"><Select name="segmentId" required disabled={!!offer} defaultValue={offer?.segmentId ?? ''}><option value="">Escolha a segmentação</option>{segments.map(segment => <option key={segment.id} value={segment.id}>{segment.name}{segment.enabled ? '' : ' (pausada)'}</option>)}</Select></Field>}
    <Field label="Nome do produto"><Input name="title" required minLength={3} maxLength={250} defaultValue={offer?.title ?? product?.title} /></Field>
    <Field label="Link do produto"><Input name="productUrl" type="url" required maxLength={2048} defaultValue={offer?.productUrl ?? product?.productUrl} /></Field>
    <Field label="Link de afiliado" hint="Use um link válido da sua conta. Salvar a oferta não envia mensagens."><Input name="affiliateUrl" type="url" required maxLength={2048} defaultValue={offer?.affiliateUrl ?? product?.affiliateUrl} /></Field>
    <div className={styles.formGrid}><Field label="Preço atual (R$)"><Input name="price" inputMode="decimal" required defaultValue={(offer ?? product)?.priceCents != null ? ((offer ?? product)!.priceCents! / 100).toFixed(2).replace('.', ',') : ''} placeholder="39,90" /></Field><Field label="Preço anterior (R$)" hint="Opcional. Informe apenas uma referência confirmada."><Input name="oldPrice" inputMode="decimal" defaultValue={(offer ?? product)?.oldPriceCents ? (((offer ?? product)!.oldPriceCents!) / 100).toFixed(2).replace('.', ',') : ''} /></Field></div>
    <Field label="Imagem da oferta"><Input name="imageUrl" type="url" maxLength={2048} defaultValue={offer?.imageUrl ?? product?.imageUrl ?? ''} /></Field>
    <Field label="Texto complementar"><TextArea name="note" maxLength={600} rows={3} defaultValue={offer?.note ?? ''} /></Field>
    <Field label="Validade da oferta" hint="Horário local. Ofertas vencidas não são enviadas."><DatePicker withTime value={expiration} onChange={event => setExpiration(event.target.value)} /></Field>
    <label className={styles.check}><Input name="verified" type="checkbox" required />Conferi agora o preço, o anúncio e o link de afiliado.</label>
  </Form>
}

export function SendForm({ offer, groupCount, save }: { offer: AffiliateOffer; groupCount: number; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [schedule, setSchedule] = useState('')
  const [key] = useState(() => crypto.randomUUID())
  return <Form label={schedule ? 'Confirmar agendamento' : 'Confirmar envio'} icon={schedule ? 'schedule' : 'check'} onSubmit={data => {
    if (!data.has('confirm')) throw new Error('Confirme a revisão antes de enviar.')
    return save({ idempotencyKey: key, ...(schedule ? { scheduledAt: new Date(schedule).toISOString() } : {}) })
  }}>
    <div className={styles.preview}><strong>{offer.title}</strong>{offer.oldPriceCents && offer.oldPriceCents > offer.priceCents ? <p>De: <s>{formatCents(offer.oldPriceCents)}</s></p> : null}<p>Por: <strong>{formatCents(offer.priceCents)}</strong></p>{offer.note ? <p>{offer.note}</p> : null}<p className={styles.url}>{offer.affiliateUrl}</p><p className={styles.muted}>Preço e estoque podem mudar a qualquer momento.</p></div>
    <p>Destino: <strong>{offer.segment?.name ?? 'Segmentação da oferta'}</strong> · {groupCount} {groupCount === 1 ? 'grupo ativo' : 'grupos ativos'} nesta lista. O envio inclui todos os grupos ativos da segmentação, respeitando pausas de conexões e grupos. Cada destino terá seu próprio registro de entrega.</p>
    <Field label="Agendar envio (opcional)" hint="Deixe vazio para colocar na fila agora. Horário local."><DatePicker withTime value={schedule} onChange={event => setSchedule(event.target.value)} /></Field>
    <label className={styles.check}><Input name="confirm" type="checkbox" required />Revisei o preço, o link de afiliado e os grupos de destino.</label>
  </Form>
}

export function ImportGroupForm({ groups, instances, segments, save }: { groups: Array<{ jid: string; name: string; participantCount: number }>; instances: AffiliateInstance[]; segments: AffiliateSegment[]; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [instanceId, setInstanceId] = useState(instances[0]?.id ?? '')
  const linkedSegments = segments.filter(segment => (segment.instanceIds ?? (segment.instanceId ? [segment.instanceId] : [])).includes(instanceId))
  return <Form label="Vincular grupo" icon="link" onSubmit={data => save({ segmentId: value(data, 'segmentId'), instanceId: value(data, 'instanceId'), jid: value(data, 'jid') })}>
    <Field label="Segmentação do grupo"><Select name="segmentId" required><option value="">Escolha a segmentação</option>{linkedSegments.map(segment => <option key={segment.id} value={segment.id}>{segment.name}</option>)}</Select></Field>
    <Field label="Conexão do WhatsApp"><Select name="instanceId" required value={instanceId} onChange={event => setInstanceId(event.target.value)}>{instances.map(instance => <option key={instance.id} value={instance.id}>{instance.name}</option>)}</Select></Field>
    <Field label="Grupo no WhatsApp"><Select name="jid" required><option value="">Escolha o grupo</option>{groups.map(group => <option key={group.jid} value={group.jid}>{group.name} ({group.participantCount} participantes)</option>)}</Select></Field>
    {!linkedSegments.length ? <p className={styles.warning}>Vincule esta conexão a uma segmentação antes de adicionar o grupo. Abra Segmentações e edite as conexões do tema.</p> : null}
    {groups.length ? null : <p className={styles.muted}>Nenhum grupo retornado por esta conexão. Confira a conexão e atualize.</p>}
  </Form>
}
