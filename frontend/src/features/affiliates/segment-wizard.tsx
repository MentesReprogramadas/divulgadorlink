'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, TextArea } from '@/components/ui/input'
import { Stepper } from '@/components/ui/stepper'
import { ActionIcon } from '@/components/ui/action-icon'
import { InstanceForm } from './affiliate-forms'
import { AffiliateImageUpload } from './affiliate-image-upload'
import { requestConnectionQr, type AffiliateConnectionQr as Connection } from './connection-qr'
import { affiliateRequest, type AffiliateInstance, type AffiliateSegment } from './contracts'
import styles from './affiliates.module.css'

const steps = ['Identidade dos grupos', 'Conectar WhatsApp', 'Revisar e criar']

export function SegmentWizard({ segment, instances, save, onConnectionSaving }: { segment?: AffiliateSegment; instances: AffiliateInstance[]; save: (body: Record<string, unknown>) => Promise<void>; onConnectionSaving?: (saving: boolean) => void }) {
  const [step, setStep] = useState(0), [pending, setPending] = useState(false), [imagePending, setImagePending] = useState(false), [error, setError] = useState('')
  const [name, setName] = useState(segment?.name ?? ''), [slug, setSlug] = useState(segment?.slug ?? ''), [description, setDescription] = useState(segment?.description ?? '')
  const [groupName, setGroupName] = useState(segment?.groupName ?? segment?.name ?? '')
  const [imageUrl, setImageUrl] = useState(segment?.imageUrl ?? ''), [capacity, setCapacity] = useState(segment?.capacity ?? 1024), [autoExpand, setAutoExpand] = useState(segment?.autoExpand ?? true)
  const [joinMode, setJoinMode] = useState<'REDIRECT' | 'SCREEN'>(segment?.joinMode ?? 'REDIRECT')
  const [available, setAvailable] = useState(instances), [selected, setSelected] = useState<string[]>(segment?.instanceIds ?? (segment?.instanceId ? [segment.instanceId] : []))
  const [states, setStates] = useState<Record<string, string>>({}), [connection, setConnection] = useState<{ instance: AffiliateInstance; result: Connection } | null>(null), [adding, setAdding] = useState(!instances.length), [editingInstance, setEditingInstance] = useState<AffiliateInstance | undefined>(undefined)
  const wizard = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), qrHeading = useRef<HTMLHeadingElement>(null), lock = useRef(false), qrRequest = useRef<AbortController | null>(null), active = useRef(true)
  const connectingId = connection?.instance.id
  useEffect(() => {
    if (wizard.current?.parentElement) wizard.current.parentElement.scrollTop = 0
    heading.current?.focus({ preventScroll: true })
  }, [step])
  useEffect(() => { active.current = true; return () => { active.current = false; qrRequest.current?.abort() } }, [])
  useEffect(() => { if (connectingId) { qrHeading.current?.focus(); qrHeading.current?.scrollIntoView?.({ block: 'nearest' }) } }, [connectingId])
  function go(next: number) { setError(''); setStep(next) }
  async function perform(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setPending(true); setError('')
    try { await action() } catch (reason) { if (active.current && !(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Falha de conexão. Os dados foram mantidos.') }
    finally { lock.current = false; if (active.current) setPending(false) }
  }
  async function verify(id: string) {
    const result = await affiliateRequest<{ state: string }>('/instances/' + id + '/status')
    setStates(previous => ({ ...previous, [id]: result.state }))
    return result.state === 'open'
  }
  async function connect(instance: AffiliateInstance) {
    qrRequest.current?.abort(); const controller = new AbortController(); qrRequest.current = controller
    setConnection({ instance, result: { state: 'connecting' } })
    const result = await requestConnectionQr(instance.id, controller.signal)
    setConnection({ instance, result })
    if (result.state) setStates(previous => ({ ...previous, [instance.id]: result.state! }))
  }
  async function saveInstance(body: Record<string, unknown>) {
    await perform(async () => {
      onConnectionSaving?.(true)
      let created: AffiliateInstance | undefined
      try {
        if (editingInstance) await affiliateRequest('/instances/' + editingInstance.id, 'PATCH', body)
        else created = await affiliateRequest<AffiliateInstance>('/instances', 'POST', body)
      } finally { onConnectionSaving?.(false) }
      if (!active.current) return
      if (editingInstance) {
        const updated = { ...editingInstance, ...(typeof body.ownerPhone === 'string' ? { ownerPhone: body.ownerPhone } : {}) }
        setAvailable(previous => previous.map(instance => instance.id === updated.id ? updated : instance)); setAdding(false); setEditingInstance(undefined)
      } else if (created) {
        const account = created
        setAvailable(previous => [account, ...previous]); setSelected(previous => [...previous, account.id]); setAdding(false)
        // A QR failure must preserve the saved account, so retry only the connection.
        await connect(created)
      }
    })
  }
  function checkConnections() { void perform(async () => {
    if (!selected.length) throw new Error('Selecione pelo menos uma conexão do WhatsApp para continuar.')
    if (selected.length > 20) throw new Error('Selecione até 20 conexões por segmentação.')
    if (autoExpand && !available.some(instance => selected.includes(instance.id) && instance.ownerPhone)) throw new Error('Informe o participante inicial em uma das contas selecionadas para criar grupos automaticamente.')
    for (const id of selected) if (!await verify(id)) throw new Error('Uma conexão selecionada está desconectada. Conecte pelo QR code ou escolha outra conexão.')
    setConnection(null); go(2)
  }) }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void perform(() => save({ name: name.trim(), groupName: groupName.trim(), slug: slug.trim(), description: description.trim(), imageUrl: imageUrl || null, capacity, instanceIds: selected, autoExpand, joinMode, enabled: segment?.enabled ?? true }))
  }
  return <div ref={wizard} className={styles.wizard} aria-busy={pending}>
    <Stepper steps={steps} current={step} onBack={go} disabled={pending} label="Etapas da segmentação" />
    <div className={styles.wizardHeading}><h3 ref={heading} tabIndex={-1}>{step === 0 ? 'Como serão os grupos?' : step === 1 ? 'Quais contas vão cuidar desta segmentação?' : 'Confira sua segmentação'}</h3><p>{step === 0 ? 'Defina o tema e o convite. Os novos grupos herdam estas informações.' : step === 1 ? 'Use uma ou mais conexões. A mesma conta pode participar de outras segmentações.' : 'Salvar não envia ofertas. Depois, vincule os grupos ou utilize o convite para criar o primeiro grupo.'}</p></div>
    {step === 0 ? <form className={styles.form} onSubmit={event => { event.preventDefault(); go(1) }}>
      <fieldset className={styles.fieldset} disabled={pending}><legend>Identidade e convite</legend>
        <Field label="Nome da segmentação" hint="Tema usado para organizar a operação no painel. Exemplo: Natal 2026."><Input name="name" value={name} onChange={event => { setName(event.target.value); if (!segment && (!slug || slug === slugify(name))) setSlug(slugify(event.target.value)) }} required minLength={2} maxLength={80} placeholder="Natal 2026" /></Field>
        <Field label="Nome dos grupos no WhatsApp" hint="Nome que as pessoas verão no WhatsApp. Os grupos recebem a sequência #1, #2, #3. Alterar este campo afeta apenas os próximos grupos."><Input name="groupName" value={groupName} onChange={event => setGroupName(event.target.value)} required minLength={2} maxLength={80} placeholder="Ofertas de Natal" /></Field>
        <Field label="Endereço do convite permanente" hint="Este endereço encaminha as pessoas para um grupo com vaga. Use letras minúsculas, números e hífens."><Input name="slug" value={slug} onChange={event => setSlug(event.target.value)} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="ofertas-de-natal" /></Field>
        <p className={styles.invitePreview}>/ofertas/entrar/<strong>{slug || 'seu-convite'}</strong></p>
        <Field label="Descrição dos grupos" hint="Apresentação exibida nos novos grupos do WhatsApp."><TextArea name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Ofertas selecionadas para o Natal. Preços e estoque podem mudar." /></Field>
        <fieldset className={styles.fieldset}><legend>Ao abrir o convite</legend><label className={styles.check}><Input type="radio" name="joinMode" value="REDIRECT" checked={joinMode === 'REDIRECT'} onChange={() => setJoinMode('REDIRECT')} />Redirecionar para WhatsApp (padrão)</label><label className={styles.check}><Input type="radio" name="joinMode" value="SCREEN" checked={joinMode === 'SCREEN'} onChange={() => setJoinMode('SCREEN')} />Mostrar tela de convite</label><p className={styles.muted}>O redirecionamento abre um grupo com vaga, sem pedir outro clique. A tela apresenta o grupo antes de continuar.</p></fieldset>
        <AffiliateImageUpload value={imageUrl} onChange={setImageUrl} onBusyChange={setImagePending} disabled={pending} />
      </fieldset>
      <fieldset className={styles.fieldset} disabled={pending}><legend>Capacidade e expansão</legend><Field label="Participantes por grupo" hint="Ao atingir este limite, o convite poderá criar o próximo grupo."><Input name="capacity" type="number" required min={2} max={1024} value={capacity} onChange={event => setCapacity(Number(event.target.value))} /></Field><label className={styles.check}><Input type="checkbox" checked={autoExpand} onChange={event => setAutoExpand(event.target.checked)} />Criar outro grupo automaticamente quando o atual estiver cheio</label><p className={styles.muted}>A expansão usa o mesmo nome, foto e descrição, acrescentando #2, #3 e assim por diante.</p></fieldset>
      <Button type="submit" disabled={imagePending}><ActionIcon name="next" />Continuar para WhatsApp</Button>
    </form> : null}
    {step === 1 ? <div className={styles.form}>
      {connection ? <section className={styles.qrPanel} aria-label={'Conectar ' + connection.instance.name}><h4 ref={qrHeading} tabIndex={-1}>Conectar {connection.instance.name}</h4><p>No celular da conta que você quer conectar, abra WhatsApp → Aparelhos conectados → Conectar aparelho.</p>{connection.result.base64?.startsWith('data:image/png;base64,') ? <img className={styles.qr} src={connection.result.base64} alt={'QR code de ' + connection.instance.name} width={256} height={256} /> : <p>{connection.result.state === 'open' ? 'Esta conta já está conectada.' : connection.result.pairingCode ? 'Código de pareamento: ' + connection.result.pairingCode : pending ? 'Preparando o QR code…' : 'O QR code ainda não está disponível. Gere outro código para tentar novamente.'}</p>}<div className={styles.actions}><Button type="button" variant="secondary" disabled={pending} onClick={() => void perform(async () => { if (await verify(connection.instance.id)) setConnection(null); else throw new Error('O WhatsApp ainda não confirmou a conexão. Leia o QR code no celular e confira novamente.') })}><ActionIcon name="refresh" />Já conectei; conferir</Button>{connection.result.state !== 'open' ? <Button type="button" variant="ghost" disabled={pending} onClick={() => void perform(() => connect(connection.instance))}><ActionIcon name="qr" />Gerar outro QR code</Button> : null}</div></section> : null}
      <fieldset className={styles.fieldset} disabled={pending}><legend>Conexões desta segmentação</legend>{!available.length ? <p className={styles.empty}>Você ainda não tem uma conexão. Cadastre uma conta abaixo e conecte pelo QR code para continuar.</p> : available.map(instance => <div key={instance.id} className={styles.connectionChoice}><label className={styles.check}><Input type="checkbox" checked={selected.includes(instance.id)} disabled={(!instance.enabled || !instance.configured) && !selected.includes(instance.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, instance.id] : previous.filter(id => id !== instance.id))} /><span><strong>{instance.name}</strong><small>{!instance.enabled ? 'Pausada' : !instance.configured ? 'Configuração pendente' : states[instance.id] === 'open' ? 'Conectada' : states[instance.id] ? 'Desconectada' : 'Conexão ainda não conferida'}</small></span></label><div className={styles.actions}><Button type="button" variant="ghost" onClick={() => { setEditingInstance(instance); setAdding(true) }}><ActionIcon name="edit" />Editar conexão<span className={styles.srOnly}> de {instance.name}</span></Button><Button type="button" variant="secondary" disabled={!instance.enabled || !instance.configured} onClick={() => void perform(() => connect(instance))}><ActionIcon name="qr" />Conectar WhatsApp<span className={styles.srOnly}> de {instance.name}</span></Button><Button type="button" variant="ghost" disabled={!instance.enabled || !instance.configured} onClick={() => void perform(async () => { await verify(instance.id) })}><ActionIcon name="refresh" />Conferir conexão<span className={styles.srOnly}> de {instance.name}</span></Button></div></div>)}</fieldset>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => { setEditingInstance(undefined); setAdding(!adding) }}><ActionIcon name={adding ? 'close' : 'plus'} />{adding ? 'Fechar cadastro de conexão' : 'Adicionar outra conexão'}</Button>
      {adding ? <section className={styles.inlineForm} aria-label="Nova conexão do WhatsApp"><h4>{editingInstance ? 'Editar conexão do WhatsApp' : 'Nova conexão do WhatsApp'}</h4><InstanceForm key={editingInstance?.id ?? 'new'} instance={editingInstance} save={saveInstance} /></section> : null}
      <p className={styles.muted}>Para alternar envios, todas as contas selecionadas precisam participar dos grupos e ter permissão de envio. Um envio com resultado incerto exige conferência antes de repetir.</p>
      <div className={styles.actions}><Button type="button" variant="secondary" disabled={pending} onClick={() => go(0)}><ActionIcon name="back" />Voltar</Button><Button type="button" loading={pending} disabled={!selected.length || adding} onClick={checkConnections}><ActionIcon name="next" />Conferir conexões e continuar</Button></div>
    </div> : null}
    {step === 2 ? <form className={styles.form} onSubmit={submit}><dl className={styles.review}><div><dt>Segmentação no painel</dt><dd>{name}</dd></div><div><dt>Nome dos grupos no WhatsApp</dt><dd>{groupName} #1, #2, #3…</dd></div><div><dt>Convite permanente</dt><dd>/ofertas/entrar/{slug}</dd></div><div><dt>Ao abrir o convite</dt><dd>{joinMode === 'SCREEN' ? 'Mostrar tela de convite' : 'Redirecionar para WhatsApp'}</dd></div><div><dt>Contas do WhatsApp</dt><dd>{available.filter(instance => selected.includes(instance.id)).map(instance => instance.name).join(', ')}</dd></div><div><dt>Participantes por grupo</dt><dd>{capacity}</dd></div><div><dt>Expansão de grupos</dt><dd>{autoExpand ? 'Automática, quando o grupo estiver cheio' : 'Desativada'}</dd></div></dl><p className={styles.muted}>As conexões serão verificadas novamente ao salvar. Novos grupos recebem o nome, a foto e a descrição definidos na primeira etapa.</p><div className={styles.actions}><Button type="button" variant="secondary" disabled={pending} onClick={() => go(1)}><ActionIcon name="back" />Voltar</Button><Button type="submit" loading={pending}><ActionIcon name={segment ? 'save' : 'plus'} />{segment ? 'Salvar segmentação' : 'Criar segmentação'}</Button></div></form> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </div>
}

function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) }
