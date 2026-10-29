'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Field, Select } from '@/components/ui/input'
import type { AffiliateInstance, AffiliateSegment } from './contracts'
import styles from './affiliates.module.css'

type RemoteGroup = { jid: string; name: string; participantCount: number }
export function LinkSegmentGroupForm({ segment, instances, loadGroups, save }: { segment: AffiliateSegment; instances: AffiliateInstance[]; loadGroups: (instanceId: string) => Promise<RemoteGroup[]>; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [instanceId, setInstanceId] = useState(instances[0]?.id ?? ''), [groups, setGroups] = useState<RemoteGroup[]>([]), [jid, setJid] = useState(''), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  useEffect(() => { let active = true; setGroups([]); setJid(''); setError(''); if (!instanceId) return; setLoading(true); void loadGroups(instanceId).then(result => { if (active) setGroups(result) }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível consultar os grupos.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [instanceId, loadGroups])
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (lock.current) return; lock.current = true; setSaving(true); setError(''); try { await save({ segmentId: segment.id, instanceId, jid }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível vincular o grupo.') } finally { lock.current = false; setSaving(false) } }
  return <form className={styles.form} onSubmit={event => void submit(event)}><p>Escolha o grupo que receberá as ofertas de <strong>{segment.name}</strong>. Só aparecem contas vinculadas a esta segmentação.</p><Field label="Conta do WhatsApp"><Select required value={instanceId} onChange={event => setInstanceId(event.target.value)} disabled={saving}>{instances.map(instance => <option key={instance.id} value={instance.id}>{instance.name}</option>)}</Select></Field><Field label="Grupo do WhatsApp"><Select required disabled={loading || saving} value={jid} onChange={event => setJid(event.target.value)}><option value="">{loading ? 'Consultando seus grupos…' : 'Escolha um grupo'}</option>{groups.map(group => <option key={group.jid} value={group.jid}>{group.name} ({group.participantCount} participantes)</option>)}</Select></Field>{!loading && !groups.length ? <p className={styles.muted}>Nenhum grupo disponível nesta conta. Confira se ela participa do grupo que você deseja usar.</p> : null}{error ? <p role="alert" className={styles.error}>{error}</p> : null}<Button type="submit" loading={saving} disabled={loading || !jid}><ActionIcon name="link" />Vincular este grupo</Button></form>
}
