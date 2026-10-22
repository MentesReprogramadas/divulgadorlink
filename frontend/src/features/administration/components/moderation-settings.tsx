'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import styles from './moderation-settings.module.css'

type Settings = { threshold: number; message?: string }
const percent = (value: number | null) => value === null ? 'Não registrada' : `${Math.round(value * 100)}%`

export function ModerationSettings() {
  const id = useId()
  const [saved, setSaved] = useState<number | null>(null)
  const [draft, setDraft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void api<Settings>('/v1/admin/settings/moderation').then(result => {
      if (!active) return
      if (result.status !== 200 || !Number.isFinite(result.body.threshold) || result.body.threshold < 0 || result.body.threshold > 1) {
        setSaved(null)
        setError(result.body.message ?? 'Não foi possível carregar o limiar de aprovação.')
        return
      }
      setSaved(result.body.threshold)
      setDraft(Math.round(result.body.threshold * 100))
    }).catch(() => {
      if (active) { setSaved(null); setError('Não foi possível conectar para carregar o limiar.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  async function save() {
    if (saving || saved === null) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await api<{ config?: { value: string }; message?: string }>('/v1/admin/config/MODERATION_AUTO_APPROVE_THRESHOLD', {
        method: 'PATCH', body: JSON.stringify({ value: String(draft / 100) }),
      })
      if (result.status !== 200 || !result.body.config) {
        setError(result.body.message ?? 'Não foi possível salvar. Seu ajuste foi mantido para tentar novamente.')
        return
      }
      setSaved(Number(result.body.config.value))
      setNotice('Limiar salvo. A mudança vale para as próximas análises. Os motivos das análises de links seguem nos avisos do WhatsApp, quando a integração está ativa.')
    } catch { setError('Não foi possível conectar. Seu ajuste foi mantido para tentar novamente.') }
    finally { setSaving(false) }
  }

  return <div className={styles.root}>
    <p>Defina a confiança mínima para a aprovação automática de links, alterações de texto, páginas, convites e coleções.</p>
    {loading ? <p role="status">Carregando limiar de aprovação…</p> : saved !== null ? <form className={styles.form} onSubmit={event => { event.preventDefault(); void save() }}>
      <div className={styles.label}><label htmlFor={id}>Limiar de aprovação da IA</label><output htmlFor={id}>{draft}%</output></div>
      <input id={id} className={styles.range} type="range" min={0} max={100} step={1} value={draft} aria-valuetext={`${draft}%${draft === 0 ? ', análise da IA desativada' : ''}`} aria-describedby={`${id}-rule`} disabled={saving} onChange={event => { setDraft(Number(event.target.value)); setNotice('') }} />
      <div className={styles.scale} aria-hidden="true"><span>0% · Sem análise da IA</span><span>100% · Confiança máxima</span></div>
      <div id={`${id}-rule`} className={draft === 0 ? styles.warning : styles.rule}>
        {draft === 0 ? <p><strong>Aprovação automática sem IA.</strong> Ao salvar em 0%, todos os conteúdos elegíveis passam sem consultar a IA, inclusive quando ela está indisponível.</p> : <p><strong>Como a decisão funciona:</strong> a IA precisa aprovar o conteúdo e informar confiança igual ou superior a {draft}%. Parecer negativo, confiança menor ou falha da IA encaminham para revisão humana.</p>}
        <p>Bloqueios de conteúdo e destino, verificação, suspensão, permissões e demais validações continuam valendo. Encaminhar para revisão não é uma recusa definitiva. Coleções não aprovadas permanecem privadas.</p>
      </div>
      <div className={styles.actions}><Button type="submit" loading={saving} disabled={draft / 100 === saved}>Salvar limiar</Button><span>Valor salvo: {percent(saved)}</span></div>
    </form> : <Button variant="secondary" onClick={() => setReload(value => value + 1)}>Tentar carregar novamente</Button>}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <p role="status" className={styles.notice}>{notice}</p>
  </div>
}
