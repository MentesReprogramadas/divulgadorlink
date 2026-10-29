'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Stepper } from '@/components/ui/stepper'
import { TabNavigation } from '@/components/ui/tabs'
import { type AffiliateSnapshot } from './contracts'
import styles from './affiliates.module.css'

export type SegmentSection = 'groups' | 'offers' | 'deliveries'
const sections = [{ id: 'groups', label: 'Grupos' }, { id: 'offers', label: 'Ofertas' }, { id: 'deliveries', label: 'Envios' }]

export function SegmentWorkspace({ snapshot, states, section, busy, onSection, onBack, onEdit, onConnections, onCreateGroup, onLinkGroup, onCatalog, onReconcile, children }: { snapshot: AffiliateSnapshot; states: Record<string, string>; section: SegmentSection; busy: boolean; onSection: (section: SegmentSection) => void; onBack: () => void; onEdit: () => void; onConnections: () => void; onCreateGroup: () => void; onLinkGroup: () => void; onCatalog: () => void; onReview: () => void; onReconcile: () => void; children: ReactNode }) {
  const segment = snapshot.segments[0]
  if (!segment) return null
  const hasConnection = snapshot.instances.some(instance => instance.enabled && states[instance.id] === 'open')
  const checking = snapshot.instances.some(instance => instance.enabled && instance.configured && (!states[instance.id] || states[instance.id] === 'checking'))
  const hasGroup = (snapshot.readiness?.activeGroups ?? snapshot.groups.filter(group => group.enabled).length) > 0
  const uncertainGroup = segment.provisionState !== 'IDLE' && segment.provisionState !== 'READY'
  const unconfigured = snapshot.instances.some(instance => instance.enabled && !instance.configured)
  const connectionLabel = unconfigured ? 'Revisar contas da segmentação' : checking ? 'Conferindo WhatsApp…' : snapshot.instances.some(instance => instance.enabled && states[instance.id] === 'close') ? 'Conectar WhatsApp' : snapshot.instances.some(instance => instance.enabled && states[instance.id] === 'connecting') ? 'Abrir QR code' : snapshot.instances.some(instance => instance.enabled) ? 'Tentar verificar conexão' : snapshot.instances.length ? 'Ativar conta do WhatsApp' : 'Configurar WhatsApp'
  const step = !hasConnection ? 0 : !hasGroup ? 1 : 2
  const next = uncertainGroup ? { title: 'Confira a criação do grupo', description: 'A última criação precisa de conferência. Não criaremos outro grupo enquanto isso.', label: 'Conferir criação', action: onReconcile } : !segment.enabled ? { title: 'Esta segmentação está pausada', description: 'Ative a segmentação nas configurações antes de preparar os grupos ou enviar ofertas.', label: 'Editar segmentação', action: onEdit } : !hasConnection ? { title: checking ? 'Conferindo o WhatsApp…' : 'Conecte o WhatsApp desta segmentação', description: unconfigured ? 'Uma conta selecionada precisa de configuração no servidor. Revise as contas vinculadas ou escolha outra conta configurada.' : 'Uma conta conectada cria os grupos e envia as ofertas. O próximo passo será preparar o primeiro grupo.', label: connectionLabel, action: onConnections } : !hasGroup ? snapshot.groups.length ? { title: 'Ative um grupo para receber ofertas', description: 'Os grupos desta segmentação estão pausados. Ative um deles na lista abaixo.', label: 'Ver grupos', action: () => onSection('groups') } : { title: 'Prepare o primeiro grupo', description: 'A segmentação organiza o tema. Agora crie o grupo no WhatsApp ou vincule um grupo que você já tem.', label: 'Criar primeiro grupo', action: onCreateGroup } : { title: 'Encontre e envie uma oferta', description: 'Os produtos são coletados automaticamente. Abra uma oferta para conferir a foto, o preço, a mensagem e os grupos antes de enviar.', label: 'Ver ofertas', action: onCatalog }
  return <div className={styles.segmentWorkspace}>
    <div className={styles.workspaceTitle}><Button variant="ghost" onClick={onBack}><ActionIcon name="back" />Segmentações</Button><div><h2>{segment.name}</h2><p>Grupos no WhatsApp: <strong>{segment.groupName ?? segment.name}</strong></p></div><details className={styles.moreActions}><summary>Configurações da segmentação</summary><div><Button variant="ghost" disabled={busy} onClick={onEdit}><ActionIcon name="edit" />Editar dados e contas</Button></div></details></div>
    {section !== 'offers' || step < 2 ? <section className={styles.nextStep} aria-label="Próximo passo da segmentação">
      <Stepper steps={['WhatsApp conectado', 'Grupo preparado', 'Revisar e enviar oferta']} current={step} label="Preparação da segmentação" />
      <div className={styles.nextStepBody}><div><h3>{next.title}</h3><p>{next.description}</p></div><div className={styles.nextStepActions}><Button disabled={busy || checking && !hasConnection} onClick={next.action}><ActionIcon name={uncertainGroup ? 'refresh' : step === 0 ? 'qr' : 'next'} />{next.label}</Button>{hasConnection && !hasGroup && !snapshot.groups.length && !uncertainGroup ? <Button variant="ghost" disabled={busy} onClick={onLinkGroup}>Já tenho um grupo</Button> : null}</div></div>
    </section> : null}
    <TabNavigation value={section} onChange={value => onSection(value as SegmentSection)} label="Conteúdo desta segmentação" items={sections} idPrefix="affiliate-segment" />
    <div role="tabpanel" id={'affiliate-segment-panel-' + section} aria-labelledby={'affiliate-segment-' + section} className={styles.areaPanel} tabIndex={0}>{children}</div>
  </div>
}
