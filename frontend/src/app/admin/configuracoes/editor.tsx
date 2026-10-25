'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/feedback/skeleton'
import { LiquidLens } from '@/components/ui/liquid-lens'
import surfaces from '@/features/administration/components/admin-surfaces.module.css'

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
    }).catch(() => {
      setError('Não foi possível conectar para carregar a configuração.')
      setReady(true)
    })
  }, [])

  async function toggle() {
    if (saving) return
    const next = !on
    setSaving(true)
    setError('')
    try {
      const result = await api<{ showImpressions?: boolean; message?: string }>('/v1/admin/settings/impressions', {
        method: 'PATCH',
        body: JSON.stringify({ showImpressions: next }),
      })
      setSaving(false)
      if (result.status === 200) setOn(result.body.showImpressions === true)
      else setError(result.body.message ?? 'Não foi possível salvar.')
    } catch {
      setError('Não foi possível conectar. A configuração foi mantida.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="setting-row">
        <div>
          <p className="setting-title">Impressões no catálogo</p>
          <p className="setting-copy">Mostra o olho e o total de impressões nos links públicos. O painel do dono continua com as métricas.</p>
        </div>
        {!ready ? <span role="status" aria-label="Carregando configuração"><Skeleton width={44} height={24} round /></span> : <button
          type="button"
          role="switch"
          className={`${on ? 'switch is-on' : 'switch'} ${surfaces.toggle}`}
          aria-checked={on}
          aria-label="Impressões no catálogo"
          aria-busy={saving || undefined}
          disabled={!ready || saving}
          onClick={() => void toggle()}
        >
          <LiquidLens radius={20} />
          <span className="switch-knob" />
        </button>}
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </>
  )
}
