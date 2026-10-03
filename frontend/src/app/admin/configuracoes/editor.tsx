'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function SettingsEditor() {
  const [on, setOn] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void api<{ showImpressions?: boolean }>('/v1/admin/settings/impressions').then((result) => {
      if (result.status === 200) setOn(result.body.showImpressions !== false)
      else setError('Não foi possível carregar a configuração.')
      setReady(true)
    })
  }, [])

  async function toggle() {
    if (saving) return
    const next = !on
    setSaving(true)
    setError('')
    const result = await api<{ showImpressions?: boolean; message?: string }>('/v1/admin/settings/impressions', {
      method: 'PATCH',
      body: JSON.stringify({ showImpressions: next }),
    })
    setSaving(false)
    if (result.status === 200) setOn(result.body.showImpressions === true)
    else setError(result.body.message ?? 'Não foi possível salvar.')
  }

  return (
    <>
      <div className="setting-row">
        <div>
          <p className="setting-title">Impressões no catálogo</p>
          <p className="setting-copy">Mostra o olho e o total de impressões nos links públicos. O painel do dono continua com as métricas.</p>
        </div>
        <button
          type="button"
          role="switch"
          className={on ? 'switch is-on' : 'switch'}
          aria-checked={on}
          aria-label="Impressões no catálogo"
          disabled={!ready || saving}
          onClick={() => void toggle()}
        >
          <span className="switch-knob" />
        </button>
      </div>
      {error ? <p>{error}</p> : null}
    </>
  )
}
