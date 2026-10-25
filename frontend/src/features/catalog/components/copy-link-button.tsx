'use client'

import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { useState } from 'react'
import styles from './ondas-catalog.module.css'

export function CopyLinkButton({ path }: { path: string }) {
  const [notice, setNotice] = useState('')
  const [failed, setFailed] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href)
      setFailed(false); setNotice('Link copiado.')
    } catch {
      setFailed(true); setNotice('Não foi possível copiar. Copie o endereço na barra do navegador.')
    }
  }
  return <><button type="button" className={styles.copyButton} onClick={() => void copy()}><LiquidLens radius={12} /><ActionIcon name="copy" width={18} height={18} />Copiar link</button><p role={failed ? 'alert' : 'status'} className={styles.detailStatus}>{notice}</p></>
}
