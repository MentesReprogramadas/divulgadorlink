'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/ui/file-upload'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { prepareAvatar } from '@/features/profiles/prepare-avatar'
import { affiliateRequest } from './contracts'
import styles from './affiliates.module.css'

export function AffiliateImageUpload({ value, onChange, onBusyChange, disabled = false }: { value: string; onChange: (value: string) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const preview = value.startsWith('affiliate-image:') ? '/bff/v1/admin/affiliates/images/' + encodeURIComponent(value.slice('affiliate-image:'.length)) : value
  async function upload(file: File) {
    if (busy || disabled) return
    setBusy(true); onBusyChange?.(true); setError('')
    try { const base64 = await prepareAvatar(file); const result = await affiliateRequest<{ url: string }>('/images', 'POST', { base64 }); onChange(result.url) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a imagem. Tente novamente.') }
    finally { setBusy(false); onBusyChange?.(false) }
  }
  return <div className={styles.imageUpload}><FileUpload label="Foto dos grupos" accept="image/png,image/jpeg,image/webp" disabled={disabled || busy} onChoose={file => void upload(file)} title={busy ? 'Enviando imagem…' : value ? 'Trocar imagem' : 'Enviar imagem dos grupos'} description="Escolha um arquivo ou arraste uma imagem." hint="PNG, JPG ou WebP até 5 MB. A imagem será otimizada e aplicada aos novos grupos desta segmentação." error={error} visual={preview ? <img src={preview} alt="Imagem escolhida para os grupos" width={72} height={72} /> : <ActionIcon name="image" width={30} height={30} />} />{value ? <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => onChange('')}>Remover imagem</Button> : null}<span role="status" className={styles.srOnly}>{busy ? 'Enviando imagem.' : ''}</span></div>
}
