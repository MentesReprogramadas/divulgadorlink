'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { affiliateRequest, localDate } from './contracts'
import styles from './invite-metrics.module.css'

type MembershipGroup = {
  groupId: string; groupName: string; segmentId: string
  status: 'UNCONFIGURED' | 'BASELINING' | 'READY' | 'EXPIRED'
  baselineAt: string | null; expiresAt: string | null; lastReceivedAt: string | null
  lastErrorCode: string | null; receivedDuringBaseline: number
  joins: number; leaves: number; rejoins: number; staleEvents: number
}
type MembershipSnapshot = { since: string; until: string; groups: MembershipGroup[]; totals: { joins: number; leaves: number; rejoins: number } }
const statusLabels = { UNCONFIGURED: 'Medição não configurada', BASELINING: 'Preparando medição', READY: 'Medição ativa', EXPIRED: 'Leitura inicial precisa ser renovada' }

export function MembershipMetrics({ segmentId }: { segmentId: string }) {
  const [snapshot, setSnapshot] = useState<MembershipSnapshot | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const version = useRef(0)
  const load = useCallback(async () => {
    const request = ++version.current
    setLoading(true); setError('')
    try {
      const result = await affiliateRequest<MembershipSnapshot>('/membership?segmentId=' + encodeURIComponent(segmentId))
      if (version.current === request) setSnapshot(result)
    } catch {
      if (version.current === request) setError('Não foi possível consultar as entradas. Tente atualizar.')
    } finally { if (version.current === request) setLoading(false) }
  }, [segmentId])
  useEffect(() => { setSnapshot(null); void load(); return () => { version.current++ } }, [load])
  const configured = snapshot?.groups.some(group => group.baselineAt) ?? false
  return <section className={styles.panel} aria-label="Participação nos grupos" aria-busy={loading}>
    <div className={styles.heading}><h3>Entradas e saídas reais</h3><Button variant="ghost" onClick={() => void load()} disabled={loading}><ActionIcon name="refresh" />Atualizar entradas</Button></div>
    {error ? <p role="alert">{error}</p> : null}
    <div className={styles.grid}>
      {([{ key: 'joins', label: 'Novas entradas' }, { key: 'rejoins', label: 'Retornos' }, { key: 'leaves', label: 'Saídas do grupo' }] as const).map(item => <div key={item.key}><LiquidLens radius={16} /><dl><dt>{item.label}</dt><dd>{configured && snapshot ? snapshot.totals[item.key].toLocaleString('pt-BR') : '—'}</dd></dl></div>)}
    </div>
    {snapshot ? <ul className={styles.groups}>{snapshot.groups.map(group => <li key={group.groupId}><strong>{group.groupName}</strong><span>{group.lastErrorCode ? 'Medição precisa de atenção' : statusLabels[group.status]}</span><small>{group.baselineAt ? 'Início: ' + localDate(group.baselineAt) + '. ' : ''}{group.lastReceivedAt ? 'Último evento: ' + localDate(group.lastReceivedAt) + '.' : 'Aguardando o primeiro evento do WhatsApp.'}</small></li>)}</ul> : null}
    {!loading && snapshot && !snapshot.groups.length ? <p>Prepare um grupo para começar a medir as entradas.</p> : null}
    <p>Últimos 30 dias, a partir da leitura inicial de cada grupo. Os eventos não atribuem entradas ao anúncio.</p>
  </section>
}
